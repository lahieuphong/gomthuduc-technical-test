import { Stage } from "@/generated/prisma/enums";

export const WORKFLOW_STAGES = [
  Stage.FORMING,
  Stage.DRYING_REPAIR,
  Stage.PAINTING,
  Stage.GLAZING,
  Stage.FIRING,
  Stage.QC,
  Stage.PACKING,
  Stage.COMPLETED,
] as const satisfies readonly Stage[];

const STAGE_LABELS: Record<Stage, string> = {
  [Stage.FORMING]: "Tạo hình mộc",
  [Stage.DRYING_REPAIR]: "Phơi sấy & Sửa mộc",
  [Stage.PAINTING]: "Vẽ họa tiết",
  [Stage.GLAZING]: "Tráng men",
  [Stage.FIRING]: "Nung lò",
  [Stage.QC]: "Kiểm định chất lượng",
  [Stage.PACKING]: "Đóng gói",
  [Stage.COMPLETED]: "Hoàn thành",
};

export function getNextStage(currentStage: Stage): Stage | null {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage);

  if (currentIndex === -1) {
    return null;
  }

  return WORKFLOW_STAGES[currentIndex + 1] ?? null;
}

export function canTransition(fromStage: Stage, toStage: Stage): boolean {
  return getNextStage(fromStage) === toStage;
}

export function isCompleted(stage: Stage): boolean {
  return stage === Stage.COMPLETED;
}

export function getStageLabel(stage: Stage): string {
  return STAGE_LABELS[stage];
}
