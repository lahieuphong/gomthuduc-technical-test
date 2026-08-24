import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeOrderRequestSchema,
  createBatchRequestSchema,
  orderAnalysisJsonSchema,
  orderAnalysisSchema,
  qcReportRequestSchema,
  transitionBatchRequestSchema,
} from "@/lib/schemas";

const sampleDescription =
  "Đơn 200 bình gốm họa tiết sen men lam cao 35cm, yêu cầu nung nhiệt độ cao 1280°C, hoàn thành trong 10 ngày.";

const sampleAnalysis = {
  productName: "Bình gốm họa tiết sen",
  quantity: 200,
  dimensions: {
    heightCm: 35,
    widthCm: null,
  },
  pattern: "Hoa sen",
  glazeType: "Men lam",
  firingTemperatureC: 1280,
  estimatedClayKg: 300,
  estimatedGlazeKg: 24,
  estimatedFiringHours: 12,
  deadlineDays: 10,
  priority: "HIGH",
  priorityReason: "Số lượng lớn và thời hạn tương đối ngắn.",
  assumptions: [
    "Ước tính khối lượng đất và men theo bình cao 35cm.",
  ],
};

describe("AI order analysis schemas", () => {
  it("chấp nhận và trim mô tả đơn hàng mẫu", () => {
    const result = analyzeOrderRequestSchema.safeParse({
      description: `  ${sampleDescription}  `,
    });

    assert.equal(result.success, true);
    assert.equal(result.success && result.data.description, sampleDescription);
  });

  it("từ chối mô tả rỗng, chỉ có khoảng trắng, quá ngắn hoặc quá dài", () => {
    for (const description of ["", "   ", "đơn gốm"]) {
      assert.equal(
        analyzeOrderRequestSchema.safeParse({ description }).success,
        false,
      );
    }

    assert.equal(
      analyzeOrderRequestSchema.safeParse({ description: "a".repeat(2_001) })
        .success,
      false,
    );
  });

  it("xác thực structured output mẫu và các giá trị nghiệp vụ", () => {
    const result = orderAnalysisSchema.safeParse(sampleAnalysis);

    assert.equal(result.success, true);

    if (!result.success) {
      return;
    }

    assert.equal(result.data.quantity, 200);
    assert.match(result.data.productName.toLocaleLowerCase("vi"), /bình gốm/);
    assert.match(result.data.pattern?.toLocaleLowerCase("vi") ?? "", /sen/);
    assert.match(result.data.glazeType.toLocaleLowerCase("vi"), /men lam/);
    assert.equal(result.data.dimensions.heightCm, 35);
    assert.equal(result.data.firingTemperatureC, 1280);
    assert.equal(result.data.deadlineDays, 10);
    assert.ok(result.data.estimatedClayKg > 0);
    assert.ok(result.data.estimatedGlazeKg > 0);
    assert.ok(result.data.estimatedFiringHours > 0);
    assert.ok(["LOW", "MEDIUM", "HIGH", "URGENT"].includes(result.data.priority));
  });

  it("từ chối output có quantity, estimate và priority không hợp lệ", () => {
    const result = orderAnalysisSchema.safeParse({
      ...sampleAnalysis,
      quantity: 0,
      estimatedClayKg: -1,
      priority: "CRITICAL",
    });

    assert.equal(result.success, false);
  });

  it("sinh JSON Schema tương thích Gemini từ cùng Zod schema", () => {
    assert.equal(orderAnalysisJsonSchema.type, "object");
    assert.equal("$schema" in orderAnalysisJsonSchema, false);
  });

  it("validate lại raw description và AI analysis khi tạo batch", () => {
    const validResult = createBatchRequestSchema.safeParse({
      rawDescription: sampleDescription,
      analysis: sampleAnalysis,
    });
    const invalidResult = createBatchRequestSchema.safeParse({
      rawDescription: sampleDescription,
      analysis: { ...sampleAnalysis, quantity: 0 },
    });

    assert.equal(validResult.success, true);
    assert.equal(invalidResult.success, false);
  });

  it("chỉ nhận expectedCurrentStage hợp lệ khi chuyển công đoạn", () => {
    const validResult = transitionBatchRequestSchema.safeParse({
      expectedCurrentStage: "FORMING",
    });
    const arbitraryTargetResult = transitionBatchRequestSchema.safeParse({
      expectedCurrentStage: "FORMING",
      toStage: "FIRING",
    });
    const invalidStageResult = transitionBatchRequestSchema.safeParse({
      expectedCurrentStage: "UNKNOWN",
    });

    assert.equal(validResult.success, true);
    assert.equal(arbitraryTargetResult.success, false);
    assert.equal(invalidStageResult.success, false);
  });

  it("validate số lượng QC và không nhận kết quả tính từ client", () => {
    const validResult = qcReportRequestSchema.safeParse({
      inspectedQuantity: 200,
      defectQuantity: 10,
      defectType: "Nứt men",
      notes: null,
    });
    const excessiveDefectsResult = qcReportRequestSchema.safeParse({
      inspectedQuantity: 10,
      defectQuantity: 11,
      defectType: null,
      notes: null,
    });
    const clientCalculatedResult = qcReportRequestSchema.safeParse({
      inspectedQuantity: 200,
      defectQuantity: 10,
      defectType: "Nứt men",
      notes: null,
      passedQuantity: 190,
      defectRate: 5,
    });
    const zeroInspectedResult = qcReportRequestSchema.safeParse({
      inspectedQuantity: 0,
      defectQuantity: 0,
      defectType: null,
      notes: null,
    });

    assert.equal(validResult.success, true);
    assert.equal(excessiveDefectsResult.success, false);
    assert.equal(clientCalculatedResult.success, false);
    assert.equal(zeroInspectedResult.success, false);
  });
});
