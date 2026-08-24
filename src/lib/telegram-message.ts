import type { Stage } from "@/generated/prisma/enums";
import { getStageLabel } from "@/lib/workflow";

type TransitionMessageInput = {
  code: string;
  productName: string;
  quantity: number;
  fromStage: Stage;
  toStage: Stage;
  firingTemperatureC: number | null;
};

type QcMessageInput = {
  code: string;
  productName: string;
  inspectedQuantity: number;
  passedQuantity: number;
  defectQuantity: number;
  defectRate: number;
  defectType: string | null;
};

function formatDefectRate(defectRate: number): string {
  return String(Number(defectRate.toFixed(2)));
}

export function buildTransitionTelegramMessage(
  input: TransitionMessageInput,
): string {
  const isEnteringFiring = input.toStage === "FIRING";
  const isCompleted = input.toStage === "COMPLETED";
  const title = isEnteringFiring
    ? "🔥 ĐÃ VÀO LÒ NUNG"
    : isCompleted
      ? "🎉 MẺ GỐM ĐÃ HOÀN THÀNH QUY TRÌNH"
      : "🏺 CẬP NHẬT MẺ GỐM";
  const stageLine = isCompleted
    ? `🏁 Trạng thái: ${getStageLabel(input.toStage)}`
    : `${isEnteringFiring ? "🔥" : "➡️"} Công đoạn tiếp theo: ${getStageLabel(input.toStage)}`;
  const lines = [
    title,
    "",
    `Mẻ: #${input.code}`,
    `Sản phẩm: ${input.productName}`,
    `Số lượng: ${input.quantity}`,
    "",
    `✅ Hoàn thành: ${getStageLabel(input.fromStage)}`,
    stageLine,
  ];

  if (isEnteringFiring && input.firingTemperatureC !== null) {
    lines.push(`🌡 Nhiệt độ nung: ${input.firingTemperatureC}°C`);
  }

  return lines.join("\n");
}

export function buildQcTelegramMessage(input: QcMessageInput): string {
  if (input.defectQuantity === 0) {
    return [
      "✅ QC PASSED",
      "",
      `Mẻ: #${input.code}`,
      `Sản phẩm: ${input.productName}`,
      `Đã kiểm tra: ${input.inspectedQuantity}`,
      `Đạt: ${input.passedQuantity}`,
      "Lỗi: 0",
    ].join("\n");
  }

  return [
    "🚨🔴 QC ALERT",
    "",
    `Mẻ: #${input.code}`,
    `Sản phẩm: ${input.productName}`,
    `Kiểm tra: ${input.inspectedQuantity}`,
    `Đạt: ${input.passedQuantity}`,
    `Lỗi: ${input.defectQuantity}`,
    `Tỷ lệ lỗi: ${formatDefectRate(input.defectRate)}%`,
    `Loại lỗi: ${input.defectType ?? "Chưa phân loại"}`,
    "",
    "⚠️ Yêu cầu quản lý kiểm tra.",
  ].join("\n");
}
