import { errorResponse, successResponse } from "@/lib/api-response";
import { recordTelegramNotification } from "@/lib/notification-logs";
import { QcSubmissionError, submitQcReport } from "@/lib/qc";
import { batchIdSchema, qcReportRequestSchema } from "@/lib/schemas";
import {
  buildQcTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

type QcRouteContext = {
  params: Promise<{ id: string }>;
};

const TELEGRAM_WARNING = {
  code: "TELEGRAM_FAILED" as const,
  message: "Báo cáo kiểm định đã được lưu nhưng gửi Telegram thất bại.",
};

function handleQcError(error: QcSubmissionError) {
  switch (error.code) {
    case "BATCH_NOT_FOUND":
      return errorResponse(
        "BATCH_NOT_FOUND",
        "Không tìm thấy mẻ sản xuất.",
        404,
      );
    case "QC_STAGE_CONFLICT":
      return errorResponse(
        "QC_STAGE_CONFLICT",
        "Chỉ có thể gửi báo cáo khi mẻ đang ở công đoạn Kiểm định chất lượng.",
        409,
      );
    case "QC_QUANTITY_EXCEEDED":
      return errorResponse(
        "QC_QUANTITY_EXCEEDED",
        "Số lượng kiểm tra không được vượt quá tổng số lượng của mẻ.",
        422,
      );
  }
}

function logUnexpectedError(context: string, error: unknown) {
  console.error(context, {
    errorType: error instanceof Error ? error.name : typeof error,
  });
}

export async function POST(request: Request, context: QcRouteContext) {
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
      "Nội dung yêu cầu phải là JSON hợp lệ.",
      400,
    );
  }

  const validationResult = qcReportRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Dữ liệu báo cáo kiểm định không hợp lệ.",
      400,
    );
  }

  let qcResult: Awaited<ReturnType<typeof submitQcReport>>;

  try {
    qcResult = await submitQcReport(
      idValidationResult.data,
      validationResult.data,
    );
  } catch (error: unknown) {
    if (error instanceof QcSubmissionError) {
      return handleQcError(error);
    }

    logUnexpectedError("Unexpected QC report API error.", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể lưu báo cáo kiểm định.",
      500,
    );
  }

  const notificationInput = {
    batchId: qcResult.batch.id,
    batchCode: qcResult.batch.code,
    context: "qc_report" as const,
    fromStage: qcResult.batch.currentStage,
    toStage: qcResult.batch.currentStage,
  };

  try {
    await sendTelegramMessage(
      buildQcTelegramMessage({
        code: qcResult.batch.code,
        productName: qcResult.batch.productName,
        inspectedQuantity: qcResult.qcReport.inspectedQuantity,
        passedQuantity: qcResult.qcReport.passedQuantity,
        defectQuantity: qcResult.qcReport.defectQuantity,
        defectRate: qcResult.qcReport.defectRate,
        defectType: qcResult.qcReport.defectType,
      }),
    );

    try {
      await recordTelegramNotification({
        ...notificationInput,
        status: "sent",
      });
    } catch (error: unknown) {
      logUnexpectedError("Unable to persist QC Telegram success log.", error);
    }

    return successResponse(qcResult, { status: 201 });
  } catch {
    try {
      await recordTelegramNotification({
        ...notificationInput,
        status: "failed",
      });
    } catch (error: unknown) {
      logUnexpectedError("Unable to persist QC Telegram failure log.", error);
    }

    return successResponse(qcResult, {
      status: 201,
      warning: TELEGRAM_WARNING,
    });
  }
}
