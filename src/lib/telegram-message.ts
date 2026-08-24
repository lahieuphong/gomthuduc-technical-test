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
