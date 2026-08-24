import { orderAnalysisSchema, type OrderAnalysis } from "@/lib/schemas";

export function parseOrderAnalysisResponse(
  responseText: string | undefined,
): OrderAnalysis | null {
  if (!responseText) {
    return null;
  }

  try {
    const parsedResponse: unknown = JSON.parse(responseText);
    const validationResult = orderAnalysisSchema.safeParse(parsedResponse);

    return validationResult.success ? validationResult.data : null;
  } catch {
    return null;
  }
}
