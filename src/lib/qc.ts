import "server-only";

import { EventType, Stage } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { calculateQcMetrics } from "@/lib/qc-rules";
import type { QcReportRequest } from "@/lib/schemas";

type QcSubmissionErrorCode =
  | "BATCH_NOT_FOUND"
  | "QC_STAGE_CONFLICT"
  | "QC_QUANTITY_EXCEEDED";

export class QcSubmissionError extends Error {
  readonly code: QcSubmissionErrorCode;

  constructor(code: QcSubmissionErrorCode) {
    super(code);
    this.name = "QcSubmissionError";
    this.code = code;
  }
}

export async function submitQcReport(id: string, input: QcReportRequest) {
  const currentBatch = await db.batch.findUnique({
    where: { id },
  });

  if (!currentBatch) {
    throw new QcSubmissionError("BATCH_NOT_FOUND");
  }

  if (currentBatch.currentStage !== Stage.QC) {
    throw new QcSubmissionError("QC_STAGE_CONFLICT");
  }

  const qcMetrics = calculateQcMetrics(currentBatch.quantity, input);

  if (!qcMetrics) {
    throw new QcSubmissionError("QC_QUANTITY_EXCEEDED");
  }

  const { passedQuantity, defectRate } = qcMetrics;

  return db.$transaction(async (transaction) => {
    const stageGuard = await transaction.batch.updateMany({
      where: {
        id,
        currentStage: Stage.QC,
      },
      data: {
        currentStage: Stage.QC,
      },
    });

    if (stageGuard.count !== 1) {
      throw new QcSubmissionError("QC_STAGE_CONFLICT");
    }

    const qcReport = await transaction.qCReport.create({
      data: {
        batchId: id,
        inspectedQuantity: input.inspectedQuantity,
        passedQuantity,
        defectQuantity: input.defectQuantity,
        defectType: input.defectType,
        notes: input.notes,
        defectRate,
      },
    });

    const qcLog = await transaction.stageLog.create({
      data: {
        batchId: id,
        eventType: EventType.QC_REPORTED,
        fromStage: Stage.QC,
        toStage: Stage.QC,
        message: `Đã ghi nhận kết quả kiểm định cho mẻ ${currentBatch.code}: kiểm tra ${input.inspectedQuantity}, đạt ${passedQuantity}, lỗi ${input.defectQuantity}.`,
        metadata: {
          qcReportId: qcReport.id,
          defectRate,
        },
      },
    });

    const batch = await transaction.batch.findUniqueOrThrow({
      where: { id },
    });

    return {
      batch,
      qcReport,
      qcLog,
    };
  });
}
