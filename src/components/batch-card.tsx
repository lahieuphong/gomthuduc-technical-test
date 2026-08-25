import { ArrowRight } from "lucide-react";

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
  [Priority.LOW]: "bg-slate-100 text-slate-600",
  [Priority.MEDIUM]: "bg-amber-50 text-amber-700",
  [Priority.HIGH]: "bg-orange-50 text-orange-700",
  [Priority.URGENT]: "bg-red-50 text-red-700",
};

const PRIORITY_DOTS: Record<Priority, string> = {
  [Priority.LOW]: "bg-slate-400",
  [Priority.MEDIUM]: "bg-amber-500",
  [Priority.HIGH]: "bg-orange-500",
  [Priority.URGENT]: "bg-red-500",
};

type BatchCardProps = {
  batch: BatchRecord;
  onClick: () => void;
};

export function BatchCard({ batch, onClick }: BatchCardProps) {
  return (
    <button
      aria-label={`Mở chi tiết mẻ ${batch.code}`}
      className="group w-full rounded-[15px] border border-[#ded8cf] bg-[#fffdfa] p-3 text-left shadow-[0_1px_2px_rgb(28_25_23/5%)] transition duration-200 hover:-translate-y-0.5 hover:border-[#c89884] hover:shadow-[0_8px_24px_rgb(80_52_39/10%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e]"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-bold tracking-[0.04em] text-stone-500">
          {batch.code}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold tracking-[0.06em] uppercase ${PRIORITY_STYLES[batch.priority]}`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOTS[batch.priority]}`}
          />
          {PRIORITY_LABELS[batch.priority]}
        </span>
      </div>

      <h3 className="mt-2.5 line-clamp-2 min-h-10 text-[14px] font-bold leading-5 text-stone-900 transition-colors group-hover:text-[#8b3e25]">
        {batch.productName}
      </h3>

      <dl className="mt-3 grid grid-cols-2 divide-x divide-stone-200 rounded-xl bg-[#f5f2ed] px-3 py-2">
        <div className="pr-2">
          <dt className="text-[9px] font-bold tracking-[0.08em] text-stone-400 uppercase">
            Số lượng
          </dt>
          <dd className="mt-0.5 truncate text-xs font-bold text-stone-800">
            {batch.quantity.toLocaleString("vi-VN")} sản phẩm
          </dd>
        </div>
        <div className="pl-3">
          <dt className="text-[9px] font-bold tracking-[0.08em] text-stone-400 uppercase">
            Hạn hoàn thành
          </dt>
          <dd className="mt-0.5 text-xs font-bold text-stone-800">
            {batch.deadlineDays} ngày
          </dd>
        </div>
      </dl>

      <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[10px]">
        <span className="min-w-0 truncate rounded-full bg-stone-900 px-2.5 py-1 font-semibold text-white">
          {getStageLabel(batch.currentStage)}
        </span>
        {batch.firingTemperatureC !== null && (
          <span className="shrink-0 rounded-full bg-[#f8eee8] px-2 py-1 font-semibold text-[#8b3e25]">
            {batch.firingTemperatureC}°C
          </span>
        )}
        <ArrowRight
          aria-hidden="true"
          className="ml-auto h-3.5 w-3.5 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#9f4b2e]"
        />
      </div>
    </button>
  );
}
