import { Stage } from "@/generated/prisma/enums";
import { getStageLabel, WORKFLOW_STAGES } from "@/lib/workflow";
import type { BatchRecord } from "@/types/api";
import { BatchCard } from "@/components/batch-card";

const STAGE_ACCENTS: Record<Stage, string> = {
  [Stage.FORMING]: "bg-stone-500",
  [Stage.DRYING_REPAIR]: "bg-yellow-600",
  [Stage.PAINTING]: "bg-sky-600",
  [Stage.GLAZING]: "bg-cyan-600",
  [Stage.FIRING]: "bg-orange-600",
  [Stage.QC]: "bg-violet-600",
  [Stage.PACKING]: "bg-emerald-600",
  [Stage.COMPLETED]: "bg-green-700",
};

type KanbanBoardProps = {
  batches: BatchRecord[];
  onSelectBatch: (id: string) => void;
};

export function KanbanBoard({ batches, onSelectBatch }: KanbanBoardProps) {
  return (
    <div className="kanban-scroll grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:flex lg:min-w-max lg:items-start lg:overflow-visible">
      {WORKFLOW_STAGES.map((stage) => {
        const stageBatches = batches.filter(
          (batch) => batch.currentStage === stage,
        );

        return (
          <section
            className="min-w-0 rounded-2xl border border-stone-200/80 bg-stone-100/70 p-3 lg:w-[292px] lg:shrink-0"
            key={stage}
          >
            <header className="flex items-center justify-between gap-3 px-1 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_ACCENTS[stage]}`}
                />
                <h2 className="truncate text-sm font-bold text-stone-800">
                  {getStageLabel(stage)}
                </h2>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-stone-600 shadow-sm">
                {stageBatches.length}
              </span>
            </header>

            <div className="mt-3 space-y-3">
              {stageBatches.length > 0 ? (
                stageBatches.map((batch) => (
                  <BatchCard
                    batch={batch}
                    key={batch.id}
                    onClick={() => onSelectBatch(batch.id)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 px-4 py-8 text-center text-xs text-stone-400">
                  Chưa có mẻ
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
