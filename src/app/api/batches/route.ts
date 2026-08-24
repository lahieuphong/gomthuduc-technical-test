import { errorResponse, successResponse } from "@/lib/api-response";
import {
  BatchCodeConflictError,
  createBatch,
  listBatches,
} from "@/lib/batches";
import { createBatchRequestSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const batches = await listBatches();

    return successResponse(batches);
  } catch (error: unknown) {
    console.error("Unexpected list batches API error.", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể tải danh sách mẻ sản xuất.",
      500,
    );
  }
}

export async function POST(request: Request) {
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

  const validationResult = createBatchRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Dữ liệu tạo mẻ sản xuất không hợp lệ.",
      400,
    );
  }

  try {
    const batch = await createBatch(validationResult.data);

    return successResponse(batch, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof BatchCodeConflictError) {
      return errorResponse(
        "BATCH_CODE_CONFLICT",
        "Không thể tạo mã mẻ duy nhất. Vui lòng thử lại.",
        409,
      );
    }

    console.error("Unexpected create batch API error.", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể tạo mẻ sản xuất.",
      500,
    );
  }
}
