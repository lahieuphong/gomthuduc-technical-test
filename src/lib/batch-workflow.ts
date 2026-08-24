import "server-only";

import { EventType, type Stage } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getNextStage, getStageLabel, isCompleted } from "@/lib/workflow";

type BatchTransitionErrorCode =
  | "BATCH_NOT_FOUND"
  | "WORKFLOW_CONFLICT"
  | "WORKFLOW_COMPLETED";

type NotificationStatus = "sent" | "failed";

type RecordNotificationInput = {
  batchId: string;
  batchCode: string;
  fromStage: Stage;
  toStage: Stage;
  status: NotificationStatus;
};

export class BatchTransitionError extends Error {
  readonly code: BatchTransitionErrorCode;

  constructor(code: BatchTransitionErrorCode) {
    super(code);
    this.name = "BatchTransitionError";
    this.code = code;
  }
}

export async function transitionBatchStage(
  id: string,
  expectedCurrentStage: Stage,
) {
  const currentBatch = await db.batch.findUnique({
    where: { id },
  });

  if (!currentBatch) {
    throw new BatchTransitionError("BATCH_NOT_FOUND");
  }

  if (currentBatch.currentStage !== expectedCurrentStage) {
    throw new BatchTransitionError("WORKFLOW_CONFLICT");
  }

  if (isCompleted(currentBatch.currentStage)) {
    throw new BatchTransitionError("WORKFLOW_COMPLETED");
  }

  const nextStage = getNextStage(currentBatch.currentStage);

  if (!nextStage) {
    throw new BatchTransitionError("WORKFLOW_COMPLETED");
  }

  return db.$transaction(async (transaction) => {
    const updateResult = await transaction.batch.updateMany({
      where: {
        id,
        currentStage: expectedCurrentStage,
      },
      data: {
        currentStage: nextStage,
      },
    });

    if (updateResult.count !== 1) {
      throw new BatchTransitionError("WORKFLOW_CONFLICT");
    }

    const transitionLog = await transaction.stageLog.create({
      data: {
        batchId: id,
        eventType: EventType.STAGE_TRANSITION,
        fromStage: currentBatch.currentStage,
        toStage: nextStage,
        message: `Mẻ ${currentBatch.code} chuyển từ ${getStageLabel(currentBatch.currentStage)} sang ${getStageLabel(nextStage)}.`,
        metadata: { source: "api" },
      },
    });

    const batch = await transaction.batch.findUniqueOrThrow({
      where: { id },
    });

    return {
      batch,
      fromStage: currentBatch.currentStage,
      toStage: nextStage,
      transitionLog,
    };
  });
}

export async function recordTransitionNotification(
  input: RecordNotificationInput,
) {
  const isSent = input.status === "sent";

  return db.stageLog.create({
    data: {
      batchId: input.batchId,
      eventType: isSent
        ? EventType.TELEGRAM_SENT
        : EventType.NOTIFICATION_FAILED,
      fromStage: input.fromStage,
      toStage: input.toStage,
      message: isSent
        ? `Đã gửi thông báo Telegram cho mẻ ${input.batchCode}.`
        : `Không thể gửi thông báo Telegram cho mẻ ${input.batchCode}.`,
      metadata: {
        channel: "telegram",
        status: input.status,
      },
    },
  });
}
