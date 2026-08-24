"use client";

import { useState, type FormEvent } from "react";

import { Priority } from "@/generated/prisma/enums";
import { apiRequest } from "@/lib/api-client";
import type {
  AIUsage,
  AnalyzeOrderResult,
  BatchRecord,
  OrderAnalysis,
} from "@/types/api";
import { DialogShell } from "@/components/dialog-shell";

const SAMPLE_DESCRIPTION =
  "Đơn 200 bình gốm họa tiết sen men lam cao 35cm, yêu cầu nung nhiệt độ cao 1280°C, hoàn thành trong 10 ngày.";

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: "Thấp",
  [Priority.MEDIUM]: "Trung bình",
  [Priority.HIGH]: "Cao",
  [Priority.URGENT]: "Khẩn cấp",
};

type CreateBatchModalProps = {
  onClose: () => void;
  onCreated: (batch: BatchRecord) => void;
};

type PreviewItemProps = {
  label: string;
  value: string;
};

function PreviewItem({ label, value }: PreviewItemProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
      <dt className="text-[10px] font-bold tracking-wide text-stone-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-stone-800">{value}</dd>
    </div>
  );
}

function formatDimensions(analysis: OrderAnalysis): string {
  const { heightCm, widthCm } = analysis.dimensions;

  if (heightCm === null && widthCm === null) {
    return "Chưa xác định";
  }

  if (heightCm !== null && widthCm !== null) {
    return `${heightCm} × ${widthCm} cm`;
  }

  return heightCm !== null ? `Cao ${heightCm} cm` : `Rộng ${widthCm} cm`;
}

function TokenUsage({ usage }: { usage: AIUsage }) {
  const tokenItems = [
    { label: "Input", value: usage.promptTokenCount },
    { label: "Output", value: usage.candidatesTokenCount },
    { label: "Suy luận", value: usage.thoughtsTokenCount },
    { label: "Tổng", value: usage.totalTokenCount },
  ];

  return (
    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-sky-800 uppercase">
            Mức sử dụng Gemini
          </p>
          <h4 className="mt-1 text-base font-bold text-stone-900">
            {usage.totalTokenCount.toLocaleString("vi-VN")} token cho lần phân
            tích này
          </h4>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 font-mono text-xs font-bold text-sky-800 shadow-sm">
          {usage.model}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tokenItems.map((item) => (
          <div
            className="rounded-xl border border-sky-100 bg-white px-3 py-2.5"
            key={item.label}
          >
            <dt className="text-[10px] font-bold tracking-wide text-stone-400 uppercase">
              {item.label}
            </dt>
            <dd className="mt-1 text-lg font-bold text-stone-900">
              {item.value.toLocaleString("vi-VN")}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-5 text-sky-950">
        Số liệu thực do Gemini trả về, đã cộng {usage.requestCount} lượt gọi
        {usage.requestCount > 1 ? " (bao gồm lần thử lại)" : ""}. Tổng token đã
        gồm input, output và token suy luận.
      </p>

      {usage.cachedContentTokenCount > 0 && (
        <p className="mt-1 text-xs text-sky-900">
          Trong input có {usage.cachedContentTokenCount.toLocaleString("vi-VN")}
          {" "}token từ cache.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"
          href="https://aistudio.google.com/usage"
          rel="noreferrer"
          target="_blank"
        >
          Xem mức sử dụng ↗
        </a>
        <a
          className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"
          href="https://aistudio.google.com/rate-limit?timeRange=last-28-days"
          rel="noreferrer"
          target="_blank"
        >
          Xem quota &amp; giới hạn ↗
        </a>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-stone-500">
        Gemini không trả quota miễn phí còn lại trong từng response; AI Studio
        là nguồn chính xác theo project của bạn.
      </p>
    </section>
  );
}

function AnalysisPreview({
  analysis,
  usage,
}: {
  analysis: OrderAnalysis;
  usage: AIUsage;
}) {
  return (
    <section className="mt-6 border-t border-stone-200 pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-amber-700 uppercase">
            Bước 2
          </p>
          <h3 className="mt-1 text-lg font-bold text-stone-900">
            Kiểm tra kết quả AI
          </h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          Sẵn sàng xác nhận
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <PreviewItem label="Sản phẩm" value={analysis.productName} />
        <PreviewItem
          label="Số lượng"
          value={`${analysis.quantity.toLocaleString("vi-VN")} sản phẩm`}
        />
        <PreviewItem label="Kích thước" value={formatDimensions(analysis)} />
        <PreviewItem label="Họa tiết" value={analysis.pattern ?? "Không có"} />
        <PreviewItem label="Men" value={analysis.glazeType} />
        <PreviewItem
          label="Nhiệt độ nung"
          value={`${analysis.firingTemperatureC}°C`}
        />
        <PreviewItem
          label="Đất sét ước tính"
          value={`${analysis.estimatedClayKg} kg`}
        />
        <PreviewItem
          label="Men ước tính"
          value={`${analysis.estimatedGlazeKg} kg`}
        />
        <PreviewItem
          label="Thời gian nung"
          value={`${analysis.estimatedFiringHours} giờ`}
        />
        <PreviewItem label="Deadline" value={`${analysis.deadlineDays} ngày`} />
        <PreviewItem
          label="Độ ưu tiên"
          value={PRIORITY_LABELS[analysis.priority]}
        />
        <PreviewItem label="Lý do ưu tiên" value={analysis.priorityReason} />
      </dl>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
        <p className="text-xs font-bold tracking-wide text-amber-800 uppercase">
          Các giả định của AI
        </p>
        {analysis.assumptions.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-amber-950">
            {analysis.assumptions.map((assumption, index) => (
              <li className="flex gap-2" key={`${assumption}-${index}`}>
                <span aria-hidden="true">•</span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-900">Không có giả định bổ sung.</p>
        )}
      </div>

      <TokenUsage usage={usage} />
    </section>
  );
}

export function CreateBatchModal({
  onClose,
  onCreated,
}: CreateBatchModalProps) {
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<OrderAnalysis | null>(null);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isAnalyzing || isCreating;

  const handleClose = () => {
    if (!isBusy) {
      onClose();
    }
  };

  const handleAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedDescription = description.trim();

    if (trimmedDescription.length < 10) {
      setError("Mô tả đơn hàng phải có ít nhất 10 ký tự.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const result = await apiRequest<AnalyzeOrderResult>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ description: trimmedDescription }),
      });

      setDescription(trimmedDescription);
      setAnalysis(result.data.analysis);
      setUsage(result.data.usage);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể phân tích đơn hàng.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!analysis) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const result = await apiRequest<BatchRecord>("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          rawDescription: description,
          analysis,
        }),
      });

      onCreated(result.data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tạo mẻ sản xuất.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DialogShell
      labelledBy="create-batch-title"
      onClose={handleClose}
      variant="modal"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-amber-700 uppercase">
            Mẻ sản xuất mới
          </p>
          <h2
            className="mt-1 text-xl font-bold tracking-tight text-stone-950"
            id="create-batch-title"
          >
            Tạo mẻ từ mô tả đơn hàng
          </h2>
        </div>
        <button
          aria-label="Đóng"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-2xl leading-none text-stone-500 hover:bg-stone-100 disabled:opacity-40"
          disabled={isBusy}
          onClick={handleClose}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="p-5 sm:p-7">
        <form onSubmit={handleAnalyze}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-amber-700 uppercase">
                Bước 1
              </p>
              <label
                className="mt-1 block text-lg font-bold text-stone-900"
                htmlFor="order-description"
              >
                Mô tả đơn hàng
              </label>
            </div>
            <span className="text-xs text-stone-400">
              {description.length}/2.000
            </span>
          </div>

          <textarea
            className="mt-4 min-h-36 w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
            disabled={isBusy}
            id="order-description"
            maxLength={2000}
            onChange={(event) => {
              setDescription(event.target.value);
              setAnalysis(null);
              setUsage(null);
              setError(null);
            }}
            placeholder={SAMPLE_DESCRIPTION}
            required
            value={description}
          />

          {error && (
            <p
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || description.trim().length < 10}
            type="submit"
          >
            {isAnalyzing
              ? "Đang phân tích đơn hàng..."
              : analysis
                ? "✨ Phân tích lại"
                : "✨ Phân tích bằng AI"}
          </button>
        </form>

        {analysis && usage && (
          <AnalysisPreview analysis={analysis} usage={usage} />
        )}
      </div>

      {analysis && (
        <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-stone-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7">
          <button
            className="min-h-11 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={handleClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="min-h-11 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy}
            onClick={handleCreate}
            type="button"
          >
            {isCreating ? "Đang tạo mẻ..." : "Xác nhận & Tạo mẻ"}
          </button>
        </footer>
      )}
    </DialogShell>
  );
}
