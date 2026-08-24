import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { EventType, Stage } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { CreateBatchRequest } from "@/lib/schemas";
import { getStageLabel } from "@/lib/workflow";

const BATCH_CODE_TIME_ZONE = "Asia/Ho_Chi_Minh";
const MAX_BATCH_CODE_ATTEMPTS = 5;

const batchRelations = {
  stageLogs: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  qcReports: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.BatchInclude;

export class BatchCodeConflictError extends Error {
  constructor() {
    super("BATCH_CODE_CONFLICT");
    this.name = "BatchCodeConflictError";
  }
}

function formatBatchDate(date: Date): string {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: BATCH_CODE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Không thể tạo ngày cho mã mẻ sản xuất.");
  }

  return `${year}${month}${day}`;
}

function generateBatchCode(now = new Date()): string {
  const datePart = formatBatchDate(now);
  const randomPart = randomBytes(2).toString("hex").toUpperCase();

  return `GOM-${datePart}-${randomPart}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function createBatchWithCode(
  code: string,
  input: CreateBatchRequest,
) {
  const { rawDescription, analysis } = input;

  return db.$transaction(async (transaction) => {
    const batch = await transaction.batch.create({
      data: {
        code,
        rawDescription,
        productName: analysis.productName,
        quantity: analysis.quantity,
        heightCm: analysis.dimensions.heightCm,
        widthCm: analysis.dimensions.widthCm,
        pattern: analysis.pattern,
        glazeType: analysis.glazeType,
        firingTemperatureC: analysis.firingTemperatureC,
        estimatedClayKg: analysis.estimatedClayKg,
        estimatedGlazeKg: analysis.estimatedGlazeKg,
        estimatedFiringHours: analysis.estimatedFiringHours,
        deadlineDays: analysis.deadlineDays,
        priority: analysis.priority,
        priorityReason: analysis.priorityReason,
        currentStage: Stage.FORMING,
        aiAnalysis: analysis,
      },
    });

    await transaction.stageLog.createMany({
      data: [
        {
          batchId: batch.id,
          eventType: EventType.BATCH_CREATED,
          fromStage: null,
          toStage: Stage.FORMING,
          message: `Mẻ ${code} được khởi tạo tại công đoạn ${getStageLabel(Stage.FORMING)}.`,
          metadata: { source: "api" },
        },
        {
          batchId: batch.id,
          eventType: EventType.AI_ANALYZED,
          fromStage: null,
          toStage: null,
          message: `Kết quả phân tích AI của mẻ ${code} đã được xác nhận.`,
          metadata: { assumptions: analysis.assumptions },
        },
      ],
    });

    return transaction.batch.findUniqueOrThrow({
      where: { id: batch.id },
      include: batchRelations,
    });
  });
}

export async function createBatch(input: CreateBatchRequest) {
  for (let attempt = 0; attempt < MAX_BATCH_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await createBatchWithCode(generateBatchCode(), input);
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new BatchCodeConflictError();
}

export async function listBatches() {
  return db.batch.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function getBatchDetails(id: string) {
  const result = await db.batch.findUnique({
    where: { id },
    include: batchRelations,
  });

  if (!result) {
    return null;
  }

  const { stageLogs: logs, qcReports, ...batch } = result;

  return {
    batch,
    logs,
    qcReports,
  };
}
