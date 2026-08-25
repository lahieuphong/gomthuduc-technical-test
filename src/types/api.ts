import type {
  EventType,
  Priority,
  Stage,
} from "@/generated/prisma/enums";
import type {
  OrderAnalysis as ValidatedOrderAnalysis,
  QcReportRequest,
} from "@/lib/schemas";
import type { AIUsage as GeminiAIUsage } from "@/lib/ai-usage";
import type { AIUsageSummary as GeminiAIUsageSummary } from "@/lib/ai-usage";

export type ApiWarning = {
  code: "TELEGRAM_FAILED";
  message: string;
};

export type ApiResult<T> = {
  data: T;
  warning?: ApiWarning;
};

export type OrderAnalysis = ValidatedOrderAnalysis;
export type AIUsage = GeminiAIUsage;
export type AIUsageSummary = GeminiAIUsageSummary;

export type AnalyzeOrderResult = {
  analysis: OrderAnalysis;
  usage: AIUsage;
};

export type BatchRecord = {
  id: string;
  code: string;
  rawDescription: string;
  productName: string;
  quantity: number;
  heightCm: number | null;
  widthCm: number | null;
  pattern: string | null;
  glazeType: string | null;
  firingTemperatureC: number | null;
  estimatedClayKg: number | null;
  estimatedGlazeKg: number | null;
  estimatedFiringHours: number | null;
  deadlineDays: number;
  priority: Priority;
  priorityReason: string | null;
  currentStage: Stage;
  aiAnalysis: unknown;
  createdAt: string;
  updatedAt: string;
};

export type StageLogRecord = {
  id: string;
  batchId: string;
  eventType: EventType;
  fromStage: Stage | null;
  toStage: Stage | null;
  message: string;
  metadata: unknown;
  createdAt: string;
};

export type QcReportRecord = {
  id: string;
  batchId: string;
  inspectedQuantity: number;
  passedQuantity: number;
  defectQuantity: number;
  defectType: string | null;
  notes: string | null;
  defectRate: number;
  createdAt: string;
};

export type BatchDetails = {
  batch: BatchRecord;
  logs: StageLogRecord[];
  qcReports: QcReportRecord[];
};

export type TransitionResult = {
  batch: BatchRecord;
  fromStage: Stage;
  toStage: Stage;
  transitionLog: StageLogRecord;
};

export type QcReportInput = QcReportRequest;

export type QcSubmissionResult = {
  batch: BatchRecord;
  qcReport: QcReportRecord;
  qcLog: StageLogRecord;
};
