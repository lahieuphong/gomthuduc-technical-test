import type { AIUsageSummary } from "@/types/api";

type AIUsagePanelProps = {
  usage: AIUsageSummary | null;
};

const TOKEN_ITEMS: Array<{
  key:
    | "promptTokenCount"
    | "candidatesTokenCount"
    | "thoughtsTokenCount"
    | "totalTokenCount";
  label: string;
}> = [
  { key: "promptTokenCount", label: "Đầu vào" },
  { key: "candidatesTokenCount", label: "Đầu ra" },
  { key: "thoughtsTokenCount", label: "Suy luận" },
  { key: "totalTokenCount", label: "Tổng" },
];

function formatLastRecordedAt(value: string | null): string {
  if (!value) {
    return "Chưa có lần phân tích mới";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function AIUsagePanel({ usage }: AIUsagePanelProps) {
  const modelLabel = !usage
    ? "Đang tải..."
    : usage.models.length === 0
      ? "Chưa có dữ liệu"
      : usage.models.length === 1
        ? usage.models[0].model
        : `${usage.models.length} model`;
  const modelNames = usage?.models.map((model) => model.model).join(", ");

  return (
    <section
      aria-labelledby="ai-usage-title"
      className="mt-3 overflow-hidden rounded-[18px] border border-[#ddd7ce] bg-[#fffdf9] shadow-[0_1px_2px_rgb(28_25_23/4%)]"
    >
      <div className="grid gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.7fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-sky-500"
            />
            <p className="text-[11px] font-bold tracking-[0.13em] text-sky-800 uppercase">
              Theo dõi Gemini
            </p>
            <span
              className="max-w-36 truncate rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-800"
              title={modelNames}
            >
              {modelLabel}
            </span>
          </div>
          <h2
            className="mt-1 text-[15px] font-bold tracking-tight text-stone-950"
            id="ai-usage-title"
          >
            Mức sử dụng AI
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-stone-500">
            {usage
              ? `${usage.analysisCount.toLocaleString("vi-VN")} lần phân tích · ${usage.requestCount.toLocaleString("vi-VN")} lượt gọi Gemini`
              : "Đang tải số liệu sử dụng..."}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-stone-400">
            Cập nhật: {formatLastRecordedAt(usage?.lastRecordedAt ?? null)}
          </p>
        </div>

        <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 bg-[#f7f5f1] sm:grid-cols-4 sm:divide-x sm:divide-stone-200">
          {TOKEN_ITEMS.map((item) => (
            <div
              className="min-w-0 border-b border-stone-200 px-3 py-2 last:border-b-0 even:border-l even:border-stone-200 sm:border-b-0 sm:even:border-l-0"
              key={item.key}
            >
              <dt className="truncate text-[9px] font-bold tracking-[0.08em] text-stone-500 uppercase">
                {item.label}
              </dt>
              <dd className="mt-0.5 text-[17px] font-bold tracking-tight text-stone-950 tabular-nums">
                {(usage?.[item.key] ?? 0).toLocaleString("vi-VN")}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-2">
          <a
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-[10px] font-bold text-stone-700 transition hover:border-sky-300 hover:text-sky-800"
            href="https://aistudio.google.com/usage"
            rel="noreferrer"
            target="_blank"
          >
            AI Studio ↗
          </a>
          <a
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-[10px] font-bold text-stone-700 transition hover:border-sky-300 hover:text-sky-800"
            href="https://aistudio.google.com/rate-limit?timeRange=last-28-days"
            rel="noreferrer"
            target="_blank"
          >
            Quota ↗
          </a>
        </div>
      </div>
    </section>
  );
}
