import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  EventType,
  Priority,
  Stage,
} from "../src/generated/prisma/enums";
import {
  getStageLabel,
  WORKFLOW_STAGES,
} from "../src/lib/workflow";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL chưa được cấu hình.");
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const sampleBatches = [
  {
    code: "GOM-20260824-A3F2",
    rawDescription:
      "Đơn 200 bình gốm họa tiết sen men lam cao 35cm, nung 1280°C, hoàn thành trong 10 ngày",
    productName: "Bình gốm họa tiết sen",
    quantity: 200,
    heightCm: 35,
    widthCm: 18,
    pattern: "Hoa sen",
    glazeType: "Men lam",
    firingTemperatureC: 1280,
    estimatedClayKg: 300,
    estimatedGlazeKg: 24,
    estimatedFiringHours: 12,
    deadlineDays: 10,
    priority: Priority.HIGH,
    priorityReason: "Số lượng lớn và thời hạn hoàn thành ngắn",
    currentStage: Stage.FORMING,
    aiAnalysis: {
      source: "seed",
      confidence: 0.96,
    },
  },
  {
    code: "GOM-20260824-B7D1",
    rawDescription:
      "Sản xuất 80 bộ ấm trà men ngọc họa tiết trúc, nung 1230°C trong 18 ngày",
    productName: "Bộ ấm trà men ngọc",
    quantity: 80,
    heightCm: 16,
    widthCm: 14,
    pattern: "Cây trúc",
    glazeType: "Men ngọc",
    firingTemperatureC: 1230,
    estimatedClayKg: 96,
    estimatedGlazeKg: 12,
    estimatedFiringHours: 10,
    deadlineDays: 18,
    priority: Priority.MEDIUM,
    priorityReason: "Tiến độ tiêu chuẩn",
    currentStage: Stage.FIRING,
    aiAnalysis: {
      source: "seed",
      confidence: 0.93,
    },
  },
  {
    code: "GOM-20260824-C9E4",
    rawDescription:
      "Đơn gấp 50 đĩa trang trí men rạn đường kính 30cm, họa tiết cá chép, giao trong 5 ngày",
    productName: "Đĩa trang trí cá chép",
    quantity: 50,
    heightCm: 4,
    widthCm: 30,
    pattern: "Cá chép",
    glazeType: "Men rạn",
    firingTemperatureC: 1200,
    estimatedClayKg: 45,
    estimatedGlazeKg: 7.5,
    estimatedFiringHours: 9,
    deadlineDays: 5,
    priority: Priority.URGENT,
    priorityReason: "Đơn gấp, thời hạn chỉ còn 5 ngày",
    currentStage: Stage.QC,
    aiAnalysis: {
      source: "seed",
      confidence: 0.95,
    },
  },
] as const;

function createStageLogs(currentStage: Stage) {
  const currentStageIndex = WORKFLOW_STAGES.indexOf(currentStage);
  const reachedStages = WORKFLOW_STAGES.slice(0, currentStageIndex + 1);

  return reachedStages.map((stage, index) => {
    const previousStage = WORKFLOW_STAGES[index - 1] ?? null;

    if (index === 0) {
      return {
        eventType: EventType.BATCH_CREATED,
        fromStage: null,
        toStage: stage,
        message: `Khởi tạo mẻ sản xuất tại công đoạn ${getStageLabel(stage)}.`,
        metadata: { source: "seed" },
      };
    }

    return {
      eventType: EventType.STAGE_TRANSITION,
      fromStage: previousStage,
      toStage: stage,
      message: `Chuyển từ ${getStageLabel(previousStage)} sang ${getStageLabel(stage)}.`,
      metadata: { source: "seed" },
    };
  });
}

async function main() {
  await prisma.$transaction(async (transaction) => {
    await transaction.batch.deleteMany({
      where: {
        code: {
          in: sampleBatches.map(({ code }) => code),
        },
      },
    });

    for (const sample of sampleBatches) {
      const {
        code,
        currentStage,
        ...batchData
      } = sample;

      await transaction.batch.create({
        data: {
          code,
          ...batchData,
          currentStage,
          stageLogs: {
            create: createStageLogs(currentStage),
          },
        },
      });
    }
  });

  console.info(`Đã seed ${sampleBatches.length} mẻ sản xuất mẫu.`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed dữ liệu thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
