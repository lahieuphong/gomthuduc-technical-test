import { errorResponse, successResponse } from "@/lib/api-response";
import { getBatchDetails } from "@/lib/batches";
import { batchIdSchema } from "@/lib/schemas";

type BatchRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: BatchRouteContext) {
  const { id } = await context.params;
  const validationResult = batchIdSchema.safeParse(id);

  if (!validationResult.success) {
    return errorResponse("INVALID_INPUT", "ID mẻ sản xuất không hợp lệ.", 400);
  }

  try {
    const batchDetails = await getBatchDetails(validationResult.data);

    if (!batchDetails) {
      return errorResponse(
        "BATCH_NOT_FOUND",
        "Không tìm thấy mẻ sản xuất.",
        404,
      );
    }

    return successResponse(batchDetails);
  } catch (error: unknown) {
    console.error("Unexpected batch details API error.", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể tải thông tin mẻ sản xuất.",
      500,
    );
  }
}
