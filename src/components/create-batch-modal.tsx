"use client";

import { ExternalLink, Sparkles, X } from "lucide-react";
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
  className?: string;
};

function PreviewItem({ label, value, className = "" }: PreviewItemProps) {
  return (
    <div className={`bg-white px-3.5 py-3 ${className}`}>
      <dt className="text-[10px] font-bold tracking-[0.08em] text-stone-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-5 font-semibold text-[#29231f]">
        {value}
      </dd>
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
    { label: "Đầu vào", value: usage.promptTokenCount },
    { label: "Đầu ra", value: usage.candidatesTokenCount },
    { label: "Suy luận", value: usage.thoughtsTokenCount },
    { label: "Tổng", value: usage.totalTokenCount },
  ];

  return (
    <section className="mt-3 rounded-[16px] border border-[#dfe6e8] bg-[#f5f8f8] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#38606a] uppercase">
            Gemini · Mức sử dụng
          </p>
          <p className="mt-0.5 text-sm font-semibold text-stone-800">
            {usage.totalTokenCount.toLocaleString("vi-VN")} token ·{" "}
            {usage.requestCount} lượt gọi
            {usage.requestCount > 1 ? " (gồm lần thử lại)" : ""}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#d9e2e4] bg-white px-2.5 py-1 text-[10px] font-bold text-[#38606a]">
          {usage.model}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e1e7e8] bg-[#e1e7e8] sm:grid-cols-4">
        {tokenItems.map((item) => (
          <div className="bg-white px-3 py-2" key={item.label}>
            <dt className="text-[9px] font-bold tracking-[0.08em] text-stone-400 uppercase">
              {item.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold text-stone-800">
              {item.value.toLocaleString("vi-VN")}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2.5 text-[11px] leading-4 text-[#48646b]">
        Số liệu thực do Gemini trả về. Tổng số token đã bao gồm dữ liệu đầu vào,
        dữ liệu đầu ra và token suy luận.
      </p>

      {usage.cachedContentTokenCount > 0 && (
        <p className="mt-1 text-[11px] text-[#48646b]">
          Trong dữ liệu đầu vào có{" "}
          {usage.cachedContentTokenCount.toLocaleString("vi-VN")} token được tái
          sử dụng từ bộ nhớ đệm.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <a
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38606a] underline decoration-[#9ab0b5] underline-offset-4 hover:text-[#243f46] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38606a]"
          href="https://aistudio.google.com/usage"
          rel="noreferrer"
          target="_blank"
        >
          Xem mức sử dụng
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
        <a
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38606a] underline decoration-[#9ab0b5] underline-offset-4 hover:text-[#243f46] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38606a]"
          href="https://aistudio.google.com/rate-limit?timeRange=last-28-days"
          rel="noreferrer"
          target="_blank"
        >
          Xem hạn mức và giới hạn
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>

      <p className="mt-2 text-[10px] leading-4 text-stone-500">
        Gemini không trả về hạn mức miễn phí còn lại trong từng phản hồi; Google
        AI Studio là nguồn theo dõi chính xác theo dự án.
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
    <section className="mt-4 rounded-[18px] border border-[#e8ded5] bg-white p-4 shadow-[0_8px_28px_rgba(61,43,32,0.05)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9f4b2e] text-xs font-bold text-white">
            02
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#9f4b2e] uppercase">
              Bước 2 · Xác nhận
            </p>
            <h3 className="mt-0.5 text-base font-bold text-[#1c1917]">
              Kiểm tra kết quả AI
            </h3>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
          Sẵn sàng
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-stone-200 bg-stone-200 sm:grid-cols-3">
        <PreviewItem
          className="col-span-2"
          label="Sản phẩm"
          value={analysis.productName}
        />
        <PreviewItem
          label="Số lượng"
          value={`${analysis.quantity.toLocaleString("vi-VN")} sản phẩm`}
        />
        <PreviewItem label="Kích thước" value={formatDimensions(analysis)} />
        <PreviewItem label="Họa tiết" value={analysis.pattern ?? "Không có"} />
        <PreviewItem label="Loại men" value={analysis.glazeType} />
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
        <PreviewItem
          label="Hạn hoàn thành"
          value={`${analysis.deadlineDays} ngày`}
        />
        <PreviewItem
          label="Độ ưu tiên"
          value={PRIORITY_LABELS[analysis.priority]}
        />
        <PreviewItem
          className="col-span-2 sm:col-span-3"
          label="Lý do ưu tiên"
          value={analysis.priorityReason}
        />
      </dl>

      <div className="mt-3 rounded-[14px] border border-[#eadfce] bg-[#fcf8ef] px-3.5 py-3">
        <p className="text-[10px] font-bold tracking-[0.1em] text-[#80552b] uppercase">
          Các giả định của AI
        </p>
        {analysis.assumptions.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs leading-5 text-[#594638]">
            {analysis.assumptions.map((assumption, index) => (
              <li className="flex gap-2" key={`${assumption}-${index}`}>
                <span className="text-[#9f4b2e]" aria-hidden="true">
                  •
                </span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[#6d594b]">
            Không có giả định bổ sung.
          </p>
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8ded5] bg-[#fffdf9]/95 px-4 py-3.5 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#9f4b2e] uppercase">
            Mẻ sản xuất mới · AI hỗ trợ
          </p>
          <h2
            className="mt-0.5 truncate text-lg font-bold tracking-tight text-[#1c1917] sm:text-xl"
            id="create-batch-title"
          >
            Tạo mẻ sản xuất
          </h2>
        </div>
        <div className="ml-4 flex items-center gap-3">
          <ol
            aria-label="Tiến trình tạo mẻ"
            className="hidden items-center gap-1.5 text-[10px] font-bold text-stone-400 sm:flex"
          >
            <li className="flex items-center gap-1.5 text-[#9f4b2e]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Mô tả
            </li>
            <li aria-hidden="true" className="h-px w-5 bg-stone-300" />
            <li className={analysis ? "text-[#9f4b2e]" : "text-stone-400"}>
              Xác nhận
            </li>
          </ol>
          <button
            aria-label="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e4d9d0] bg-white text-stone-500 transition hover:border-[#c9b6a8] hover:bg-[#f8f3ed] hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:opacity-40"
            disabled={isBusy}
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-[#f8f4ee] p-4 sm:p-5">
        <form
          className="rounded-[18px] border border-[#e8ded5] bg-white p-4 shadow-[0_8px_28px_rgba(61,43,32,0.05)] sm:p-5"
          onSubmit={handleAnalyze}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efe2d8] text-xs font-bold text-[#8d4128]">
                01
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#9f4b2e] uppercase">
                  Bước 1 · Nhập yêu cầu
                </p>
                <label
                  className="mt-0.5 block text-base font-bold text-[#1c1917]"
                  htmlFor="order-description"
                >
                  Mô tả đơn hàng
                </label>
              </div>
            </div>
            <span className="pt-1 text-[10px] font-medium text-stone-400">
              {description.length}/2.000
            </span>
          </div>

          <textarea
            className="mt-3 min-h-28 w-full resize-y rounded-[14px] border border-[#dcd2ca] bg-[#fffdfa] px-3.5 py-3 text-sm leading-6 text-[#29231f] outline-none transition placeholder:text-stone-400 focus:border-[#9f4b2e] focus:ring-3 focus:ring-[#ecd8ce] disabled:bg-stone-50"
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
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1c1917] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_14px_rgba(28,25,23,0.16)] transition hover:bg-[#302b27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            disabled={isBusy || description.trim().length < 10}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {isAnalyzing
              ? "Đang phân tích đơn hàng..."
              : analysis
                ? "Phân tích lại"
                : "Phân tích bằng AI"}
          </button>
        </form>

        {analysis && usage && (
          <AnalysisPreview analysis={analysis} usage={usage} />
        )}
      </div>

      {analysis && (
        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#e8ded5] bg-[#fffdf9]/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
          <button
            className="min-h-10 rounded-xl border border-[#dcd2ca] bg-white px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-[#f8f3ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:opacity-50"
            disabled={isBusy}
            onClick={handleClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="min-h-10 rounded-xl bg-[#9f4b2e] px-5 py-2 text-sm font-bold text-white shadow-[0_5px_14px_rgba(120,50,29,0.2)] transition hover:bg-[#873d26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:cursor-not-allowed disabled:opacity-50"
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
