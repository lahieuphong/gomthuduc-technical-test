import { Stage } from "@/generated/prisma/enums";
import { getStageLabel, WORKFLOW_STAGES } from "@/lib/workflow";
import type { BatchRecord } from "@/types/api";
import { BatchCard } from "@/components/batch-card";

const STAGE_ACCENTS: Record<
  Stage,
  { dot: string; line: string; count: string }
> = {
  [Stage.FORMING]: {
    dot: "bg-stone-500",
    line: "bg-stone-500",
    count: "bg-stone-200 text-stone-700",
  },
  [Stage.DRYING_REPAIR]: {
    dot: "bg-amber-500",
    line: "bg-amber-500",
    count: "bg-amber-100 text-amber-800",
  },
  [Stage.PAINTING]: {
    dot: "bg-sky-600",
    line: "bg-sky-600",
    count: "bg-sky-100 text-sky-800",
  },
  [Stage.GLAZING]: {
    dot: "bg-cyan-600",
    line: "bg-cyan-600",
    count: "bg-cyan-100 text-cyan-800",
  },
  [Stage.FIRING]: {
    dot: "bg-orange-600",
    line: "bg-orange-600",
    count: "bg-orange-100 text-orange-800",
  },
  [Stage.QC]: {
    dot: "bg-violet-600",
    line: "bg-violet-600",
    count: "bg-violet-100 text-violet-800",
  },
  [Stage.PACKING]: {
    dot: "bg-emerald-600",
    line: "bg-emerald-600",
    count: "bg-emerald-100 text-emerald-800",
  },
  [Stage.COMPLETED]: {
    dot: "bg-green-700",
    line: "bg-green-700",
    count: "bg-green-100 text-green-800",
  },
};

type KanbanBoardProps = {
  batches: BatchRecord[];
  onSelectBatch: (id: string) => void;
};

export function KanbanBoard({ batches, onSelectBatch }: KanbanBoardProps) {
  return (
    <div className="kanban-grid snap-x snap-mandatory gap-2.5 pb-3">
      {WORKFLOW_STAGES.map((stage, stageIndex) => {
        const stageBatches = batches.filter(
          (batch) => batch.currentStage === stage,
        );
        const accent = STAGE_ACCENTS[stage];

        return (
          <section
            className="relative min-w-0 snap-start overflow-hidden rounded-[16px] border border-[#ddd7ce] bg-[#eae6df]/65 p-2.5"
            key={stage}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-0.5 ${accent.line}`}
            />
            <header className="flex min-h-10 items-center justify-between gap-2 px-0.5 pt-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[10px] font-bold tabular-nums text-stone-400">
                  {String(stageIndex + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`}
                />
                <h2 className="truncate text-[12px] font-bold leading-4 text-stone-800">
                  {getStageLabel(stage)}
                </h2>
              </div>
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-bold tabular-nums ${accent.count}`}
              >
                {stageBatches.length}
              </span>
            </header>

            <div className="mt-2 space-y-2.5">
              {stageBatches.length > 0 ? (
                stageBatches.map((batch) => (
                  <BatchCard
                    batch={batch}
                    key={batch.id}
                    onClick={() => onSelectBatch(batch.id)}
                  />
                ))
              ) : (
                <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-stone-300/90 bg-white/35 px-3 text-center text-[11px] font-medium text-stone-400">
                  Chưa có mẻ ở công đoạn này
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
