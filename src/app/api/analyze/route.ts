import { AIServiceError, analyzeOrderDescription } from "@/lib/ai";
import { analyzeOrderRequestSchema } from "@/lib/schemas";

type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "AI_INVALID_RESPONSE"
  | "AI_SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
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

  const validationResult = analyzeOrderRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Mô tả đơn hàng phải có từ 10 đến 2.000 ký tự.",
      400,
    );
  }

  try {
    const analysis = await analyzeOrderDescription(
      validationResult.data.description,
    );

    return Response.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    if (error instanceof AIServiceError) {
      if (error.code === "AI_INVALID_RESPONSE") {
        return errorResponse(
          "AI_INVALID_RESPONSE",
          "AI không trả về dữ liệu đơn hàng hợp lệ sau khi thử lại.",
          422,
        );
      }

      return errorResponse(
        "AI_SERVICE_UNAVAILABLE",
        error.code === "AI_NOT_CONFIGURED"
          ? "Dịch vụ AI chưa được cấu hình."
          : "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại.",
        503,
      );
    }

    console.error("Unexpected analyze API error.", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi không mong muốn.",
      500,
    );
  }
}
