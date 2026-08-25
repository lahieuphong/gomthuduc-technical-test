import "server-only";

import { EventType, type Stage } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

type TelegramNotificationStatus = "sent" | "failed";
type TelegramNotificationContext = "stage_transition" | "qc_report";

type RecordTelegramNotificationInput = {
  batchId: string;
  batchCode: string;
  status: TelegramNotificationStatus;
  context: TelegramNotificationContext;
  fromStage: Stage | null;
  toStage: Stage | null;
};

const CONTEXT_LABELS: Record<TelegramNotificationContext, string> = {
  stage_transition: "cập nhật công đoạn",
  qc_report: "kết quả kiểm định",
};

export async function recordTelegramNotification(
  input: RecordTelegramNotificationInput,
) {
  const isSent = input.status === "sent";
  const contextLabel = CONTEXT_LABELS[input.context];

  return db.stageLog.create({
    data: {
      batchId: input.batchId,
      eventType: isSent
        ? EventType.TELEGRAM_SENT
        : EventType.NOTIFICATION_FAILED,
      fromStage: input.fromStage,
      toStage: input.toStage,
      message: isSent
        ? `Đã gửi thông báo Telegram ${contextLabel} cho mẻ ${input.batchCode}.`
        : `Không thể gửi thông báo Telegram ${contextLabel} cho mẻ ${input.batchCode}.`,
      metadata: {
        channel: "telegram",
        context: input.context,
        status: input.status,
      },
    },
  });
}
