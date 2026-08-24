import { Stage } from "@/generated/prisma/enums";
import { z } from "zod";

const nullableDimensionSchema = z
  .number()
  .finite()
  .min(0.1)
  .max(1_000)
  .nullable();

export const orderDescriptionSchema = z
  .string()
  .trim()
  .min(10, "Mô tả đơn hàng phải có ít nhất 10 ký tự.")
  .max(2_000, "Mô tả đơn hàng không được vượt quá 2.000 ký tự.");

export const analyzeOrderRequestSchema = z
  .object({
    description: orderDescriptionSchema,
  })
  .strict();

export const orderAnalysisSchema = z
  .object({
    productName: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("Tên sản phẩm gốm được khách hàng yêu cầu."),
    quantity: z
      .number()
      .int()
      .min(1)
      .max(1_000_000)
      .describe("Số lượng sản phẩm, là số nguyên dương."),
    dimensions: z
      .object({
        heightCm: nullableDimensionSchema.describe(
          "Chiều cao tính bằng cm; null nếu không thể xác định hợp lý.",
        ),
        widthCm: nullableDimensionSchema.describe(
          "Chiều rộng hoặc đường kính tính bằng cm; null nếu không thể xác định hợp lý.",
        ),
      })
      .strict(),
    pattern: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .nullable()
      .describe("Tên họa tiết; null nếu đơn hàng không nêu họa tiết."),
    glazeType: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("Loại men được yêu cầu hoặc được ước tính hợp lý."),
    firingTemperatureC: z
      .number()
      .int()
      .min(600)
      .max(1_500)
      .describe("Nhiệt độ nung thực tế cho gốm, tính bằng độ C."),
    estimatedClayKg: z
      .number()
      .finite()
      .min(0.001)
      .max(1_000_000)
      .describe("Khối lượng đất sét ước tính, tính bằng kg."),
    estimatedGlazeKg: z
      .number()
      .finite()
      .min(0.001)
      .max(1_000_000)
      .describe("Khối lượng men ước tính, tính bằng kg."),
    estimatedFiringHours: z
      .number()
      .finite()
      .min(0.1)
      .max(1_000)
      .describe("Tổng thời gian nung ước tính, tính bằng giờ."),
    deadlineDays: z
      .number()
      .int()
      .min(1)
      .max(3_650)
      .describe("Số ngày cần hoàn thành đơn hàng."),
    priority: z
      .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .describe("Mức ưu tiên dựa trên số lượng, thời hạn và độ phức tạp."),
    priorityReason: z.string().trim().min(1).max(500),
    assumptions: z.array(z.string().trim().min(1).max(500)).max(20),
  })
  .strict();

export const createBatchRequestSchema = z
  .object({
    rawDescription: orderDescriptionSchema,
    analysis: orderAnalysisSchema,
  })
  .strict();

export const batchIdSchema = z.string().trim().min(1).max(100);

export const transitionBatchRequestSchema = z
  .object({
    expectedCurrentStage: z.enum(Stage),
  })
  .strict();

const nullableQcTextSchema = (maximumLength: number) =>
  z.string().trim().min(1).max(maximumLength).nullable();

export const qcReportRequestSchema = z
  .object({
    inspectedQuantity: z.number().int().min(1).max(1_000_000),
    defectQuantity: z.number().int().min(0).max(1_000_000),
    defectType: nullableQcTextSchema(200),
    notes: nullableQcTextSchema(2_000),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.defectQuantity > data.inspectedQuantity) {
      context.addIssue({
        code: "custom",
        message: "Số lượng lỗi không được vượt quá số lượng đã kiểm tra.",
        path: ["defectQuantity"],
      });
    }
  });

const jsonSchema = z.toJSONSchema(orderAnalysisSchema, {
  target: "draft-7",
}) as Record<string, unknown>;

export const orderAnalysisJsonSchema = { ...jsonSchema };
delete orderAnalysisJsonSchema.$schema;

export type AnalyzeOrderRequest = z.infer<typeof analyzeOrderRequestSchema>;
export type CreateBatchRequest = z.infer<typeof createBatchRequestSchema>;
export type OrderAnalysis = z.infer<typeof orderAnalysisSchema>;
export type QcReportRequest = z.infer<typeof qcReportRequestSchema>;
export type TransitionBatchRequest = z.infer<
  typeof transitionBatchRequestSchema
>;
