import { errorResponse, successResponse } from "@/lib/api-response";
import { getAIUsageSummary } from "@/lib/ai-usage-store";

export async function GET() {
  try {
    return successResponse(await getAIUsageSummary());
  } catch (error: unknown) {
    console.error("Unexpected AI usage API error.", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Không thể tải mức sử dụng Gemini.",
      500,
    );
  }
}
