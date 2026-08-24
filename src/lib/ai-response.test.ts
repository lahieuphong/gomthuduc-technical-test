import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseOrderAnalysisResponse } from "@/lib/ai-response";

const validAnalysis = {
  productName: "Bình gốm họa tiết sen",
  quantity: 200,
  dimensions: { heightCm: 35, widthCm: null },
  pattern: "Hoa sen",
  glazeType: "Men lam",
  firingTemperatureC: 1280,
  estimatedClayKg: 300,
  estimatedGlazeKg: 24,
  estimatedFiringHours: 12,
  deadlineDays: 10,
  priority: "HIGH",
  priorityReason: "Số lượng lớn và thời hạn tương đối ngắn.",
  assumptions: ["Ước tính nguyên liệu theo kích thước đã cung cấp."],
};

describe("AI structured response parser", () => {
  it("parses a valid Gemini JSON response", () => {
    const result = parseOrderAnalysisResponse(JSON.stringify(validAnalysis));

    assert.equal(result?.quantity, 200);
    assert.equal(result?.dimensions.heightCm, 35);
  });

  it("rejects malformed JSON", () => {
    assert.equal(parseOrderAnalysisResponse('{"quantity": 200'), null);
  });

  it("rejects syntactically valid JSON that violates the Zod schema", () => {
    assert.equal(
      parseOrderAnalysisResponse(
        JSON.stringify({ ...validAnalysis, quantity: 0 }),
      ),
      null,
    );
  });

  it("rejects missing or empty response text", () => {
    assert.equal(parseOrderAnalysisResponse(undefined), null);
    assert.equal(parseOrderAnalysisResponse(""), null);
  });
});
