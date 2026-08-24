import { Priority } from "@/generated/prisma/enums";
import { getStageLabel } from "@/lib/workflow";
import type { BatchRecord } from "@/types/api";

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: "Thấp",
  [Priority.MEDIUM]: "Trung bình",
  [Priority.HIGH]: "Cao",
  [Priority.URGENT]: "Khẩn cấp",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  [Priority.LOW]: "border-slate-200 bg-slate-50 text-slate-600",
  [Priority.MEDIUM]: "border-amber-200 bg-amber-50 text-amber-700",
  [Priority.HIGH]: "border-orange-200 bg-orange-50 text-orange-700",
  [Priority.URGENT]: "border-red-200 bg-red-50 text-red-700",
};

type BatchCardProps = {
  batch: BatchRecord;
  onClick: () => void;
};

export function BatchCard({ batch, onClick }: BatchCardProps) {
  return (
    <button
      aria-label={`Mở chi tiết mẻ ${batch.code}`}
      className="group w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs font-bold tracking-wide text-stone-500">
          {batch.code}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wide uppercase ${PRIORITY_STYLES[batch.priority]}`}
        >
          {PRIORITY_LABELS[batch.priority]}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-5 text-stone-900 group-hover:text-amber-800">
        {batch.productName}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-600">
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <span className="block text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
            Số lượng
          </span>
          <span className="mt-0.5 block font-bold text-stone-800">
            {batch.quantity.toLocaleString("vi-VN")} sản phẩm
          </span>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <span className="block text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
            Deadline
          </span>
          <span className="mt-0.5 block font-bold text-stone-800">
            {batch.deadlineDays} ngày
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-stone-900 px-2.5 py-1 font-semibold text-white">
          {getStageLabel(batch.currentStage)}
        </span>
        {batch.firingTemperatureC !== null && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
            Nung {batch.firingTemperatureC}°C
          </span>
        )}
      </div>
    </button>
  );
}
