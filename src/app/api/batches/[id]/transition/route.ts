import { errorResponse, successResponse } from "@/lib/api-response";
import {
  BatchTransitionError,
  transitionBatchStage,
} from "@/lib/batch-workflow";
import { recordTelegramNotification } from "@/lib/notification-logs";
import {
  batchIdSchema,
  transitionBatchRequestSchema,
} from "@/lib/schemas";
import {
  buildTransitionTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

type TransitionRouteContext = {
  params: Promise<{ id: string }>;
};

const TELEGRAM_WARNING = {
  code: "TELEGRAM_FAILED" as const,
  message: "Cập nhật công đoạn thành công nhưng gửi Telegram thất bại.",
};

function handleTransitionError(error: BatchTransitionError) {
  switch (error.code) {
    case "BATCH_NOT_FOUND":
      return errorResponse(
        "BATCH_NOT_FOUND",
        "Không tìm thấy mẻ sản xuất.",
        404,
      );
    case "WORKFLOW_CONFLICT":
      return errorResponse(
        "WORKFLOW_CONFLICT",
        "Trạng thái mẻ đã thay đổi. Vui lòng tải lại dữ liệu.",
        409,
      );
    case "WORKFLOW_COMPLETED":
      return errorResponse(
        "WORKFLOW_COMPLETED",
        "Mẻ đã hoàn thành và không thể chuyển công đoạn tiếp.",
        409,
      );
  }
}

function logUnexpectedError(context: string, error: unknown) {
  console.error(context, {
    errorType: error instanceof Error ? error.name : typeof error,
  });
}

export async function POST(request: Request, context: TransitionRouteContext) {
  const { id } = await context.params;
  const idValidationResult = batchIdSchema.safeParse(id);

  if (!idValidationResult.success) {
    return errorResponse("INVALID_INPUT", "ID mẻ sản xuất không hợp lệ.", 400);
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Nội dung request phải là JSON hợp lệ.",
      400,
    );
  }

  const validationResult = transitionBatchRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Dữ liệu chuyển công đoạn không hợp lệ.",
      400,
    );
  }

  let transitionResult: Awaited<ReturnType<typeof transitionBatchStage>>;

  try {
    transitionResult = await transitionBatchStage(
      idValidationResult.data,
      validationResult.data.expectedCurrentStage,
    );
  } catch (error: unknown) {
    if (error instanceof BatchTransitionError) {
      return handleTransitionError(error);
    }

    logUnexpectedError("Unexpected batch transition API error.", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể chuyển công đoạn sản xuất.",
      500,
    );
  }

  const notificationInput = {
    batchId: transitionResult.batch.id,
    batchCode: transitionResult.batch.code,
    fromStage: transitionResult.fromStage,
    toStage: transitionResult.toStage,
  };

  try {
    await sendTelegramMessage(
      buildTransitionTelegramMessage({
        code: transitionResult.batch.code,
        productName: transitionResult.batch.productName,
        quantity: transitionResult.batch.quantity,
        fromStage: transitionResult.fromStage,
        toStage: transitionResult.toStage,
        firingTemperatureC: transitionResult.batch.firingTemperatureC,
      }),
    );

    try {
      await recordTelegramNotification({
        ...notificationInput,
        context: "stage_transition",
        status: "sent",
      });
    } catch (error: unknown) {
      logUnexpectedError("Unable to persist Telegram success log.", error);
    }

    return successResponse(transitionResult);
  } catch {
    try {
      await recordTelegramNotification({
        ...notificationInput,
        context: "stage_transition",
        status: "failed",
      });
    } catch (error: unknown) {
      logUnexpectedError("Unable to persist Telegram failure log.", error);
    }

    return successResponse(transitionResult, {
      warning: TELEGRAM_WARNING,
    });
  }
}
