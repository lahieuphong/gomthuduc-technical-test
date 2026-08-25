"use client";

import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EventType, Priority, Stage } from "@/generated/prisma/enums";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import {
  getNextStage,
  getStageLabel,
  WORKFLOW_STAGES,
} from "@/lib/workflow";
import type {
  BatchDetails,
  QcReportInput,
  QcSubmissionResult,
  TransitionResult,
} from "@/types/api";
import { DialogShell } from "@/components/dialog-shell";
import { QcForm } from "@/components/qc-form";

const DETAIL_POLL_INTERVAL_MS = 2_000;

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: "Thấp",
  [Priority.MEDIUM]: "Trung bình",
  [Priority.HIGH]: "Cao",
  [Priority.URGENT]: "Khẩn cấp",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  [Priority.LOW]: "border-stone-200 bg-stone-50 text-stone-600",
  [Priority.MEDIUM]: "border-amber-200 bg-amber-50 text-amber-800",
  [Priority.HIGH]: "border-orange-200 bg-orange-50 text-orange-800",
  [Priority.URGENT]: "border-red-200 bg-red-50 text-red-800",
};

const STAGE_STYLES: Record<Stage, string> = {
  [Stage.FORMING]: "border-stone-200 bg-stone-100 text-stone-700",
  [Stage.DRYING_REPAIR]: "border-amber-200 bg-amber-50 text-amber-800",
  [Stage.PAINTING]: "border-sky-200 bg-sky-50 text-sky-800",
  [Stage.GLAZING]: "border-cyan-200 bg-cyan-50 text-cyan-800",
  [Stage.FIRING]: "border-orange-200 bg-orange-50 text-orange-800",
  [Stage.QC]: "border-violet-200 bg-violet-50 text-violet-800",
  [Stage.PACKING]: "border-indigo-200 bg-indigo-50 text-indigo-800",
  [Stage.COMPLETED]: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const EVENT_LABELS: Record<EventType, string> = {
  [EventType.BATCH_CREATED]: "Khởi tạo mẻ",
  [EventType.STAGE_TRANSITION]: "Chuyển công đoạn",
  [EventType.AI_ANALYZED]: "Phân tích AI",
  [EventType.QC_REPORTED]: "Báo cáo kiểm định",
  [EventType.TELEGRAM_SENT]: "Đã gửi Telegram",
  [EventType.NOTIFICATION_FAILED]: "Lỗi thông báo",
};

type ToastKind = "success" | "warning" | "error";

type BatchDetailDrawerProps = {
  batchId: string;
  onClose: () => void;
  onMutated: () => Promise<void>;
  onToast: (kind: ToastKind, message: string) => void;
};

type SpecItemProps = {
  label: string;
  value: string;
};

function SpecItem({ label, value }: SpecItemProps) {
  return (
    <div className="min-w-0 border-b border-stone-100 py-3 [&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
        {label}
      </dt>
      <dd
        className="mt-1 break-words text-sm font-semibold text-stone-800"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMetric(value: number | null, unit: string): string {
  return value === null
    ? "Chưa xác định"
    : `${value.toLocaleString("vi-VN")} ${unit}`;
}

function formatDimensions(
  heightCm: number | null,
  widthCm: number | null,
): string {
  if (heightCm === null && widthCm === null) {
    return "Chưa xác định";
  }

  if (heightCm !== null && widthCm !== null) {
    return `${heightCm} × ${widthCm} cm`;
  }

  return heightCm !== null ? `Cao ${heightCm} cm` : `Rộng ${widthCm} cm`;
}

function getAssumptions(aiAnalysis: unknown): string[] {
  if (
    typeof aiAnalysis !== "object" ||
    aiAnalysis === null ||
    !("assumptions" in aiAnalysis) ||
    !Array.isArray(aiAnalysis.assumptions)
  ) {
    return [];
  }

  return aiAnalysis.assumptions.filter(
    (assumption): assumption is string => typeof assumption === "string",
  );
}

export function BatchDetailDrawer({
  batchId,
  onClose,
  onMutated,
  onToast,
}: BatchDetailDrawerProps) {
  const latestRequestIdRef = useRef(0);
  const [details, setDetails] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<"transition" | "qc" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetails = useCallback(
    async () => {
      const requestId = ++latestRequestIdRef.current;

      try {
        const result = await apiRequest<BatchDetails>(
          `/api/batches/${batchId}`,
        );

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setDetails(result.data);
        setLoadError(null);
      } catch (requestError: unknown) {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setLoadError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải chi tiết mẻ sản xuất.",
        );
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [batchId],
  );

  useEffect(() => {
    let isActive = true;
    let pollingId: number | undefined;

    const poll = async () => {
      await loadDetails();

      if (isActive) {
        pollingId = window.setTimeout(() => {
          void poll();
        }, DETAIL_POLL_INTERVAL_MS);
      }
    };

    const initialLoadId = window.setTimeout(() => {
      void poll();
    }, 0);

    return () => {
      isActive = false;
      latestRequestIdRef.current += 1;
      window.clearTimeout(initialLoadId);
      if (pollingId !== undefined) {
        window.clearTimeout(pollingId);
      }
    };
  }, [loadDetails]);

  const assumptions = useMemo(
    () => getAssumptions(details?.batch.aiAnalysis),
    [details?.batch.aiAnalysis],
  );

  const handleTransition = async () => {
    if (!details || action) {
      return;
    }

    setAction("transition");
    setActionError(null);

    try {
      const result = await apiRequest<TransitionResult>(
        `/api/batches/${batchId}/transition`,
        {
          method: "POST",
          body: JSON.stringify({
            expectedCurrentStage: details.batch.currentStage,
          }),
        },
      );

      if (result.warning) {
        onToast(
          "warning",
          "Công đoạn đã được cập nhật nhưng gửi thông báo Telegram thất bại.",
        );
      } else {
        onToast(
          "success",
          `Đã chuyển mẻ sang ${getStageLabel(result.data.toStage)}.`,
        );
      }

      await Promise.all([loadDetails(), onMutated()]);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof ApiClientError && requestError.status === 409
          ? "Trạng thái mẻ đã thay đổi. Dữ liệu đang được tải lại."
          : requestError instanceof Error
            ? requestError.message
            : "Không thể chuyển công đoạn.";

      setActionError(message);
      onToast("error", message);
      await loadDetails();
      await onMutated();
    } finally {
      setAction(null);
    }
  };

  const handleQcSubmit = async (input: QcReportInput) => {
    if (!details || action) {
      return;
    }

    setAction("qc");
    setActionError(null);

    try {
      const result = await apiRequest<QcSubmissionResult>(
        `/api/batches/${batchId}/qc`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );

      if (result.warning) {
        onToast(
          "warning",
          "Kết quả kiểm định đã được lưu nhưng gửi thông báo Telegram thất bại.",
        );
      } else {
        onToast("success", "Đã lưu kết quả kiểm định chất lượng.");
      }

      await Promise.all([loadDetails(), onMutated()]);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi kết quả kiểm định.";

      setActionError(message);
      onToast("error", message);
      await loadDetails();
    } finally {
      setAction(null);
    }
  };

  const nextStage = details ? getNextStage(details.batch.currentStage) : null;
  const currentStageIndex = details
    ? WORKFLOW_STAGES.indexOf(details.batch.currentStage)
    : -1;
  const canCompleteQc =
    details?.batch.currentStage !== Stage.QC ||
    details.qcReports.length > 0;

  return (
    <DialogShell
      labelledBy="batch-detail-title"
      onClose={onClose}
      variant="drawer"
    >
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-stone-200/80 bg-[#fffdfa]/95 px-5 py-3.5 backdrop-blur-xl sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#9f4b2e] uppercase">
            Hồ sơ sản xuất
          </p>
          <h2
            className="mt-0.5 truncate text-lg font-bold tracking-tight text-[#1c1917]"
            id="batch-detail-title"
          >
            {details?.batch.code ?? "Đang tải..."}
          </h2>
          {details && (
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {details.batch.productName}
            </p>
          )}
        </div>
        <button
          aria-label="Đóng chi tiết"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-4 bg-[#faf8f4] p-4 sm:p-5">
        {isLoading && !details ? (
          <div className="space-y-3" aria-label="Đang tải chi tiết">
            <div className="h-52 animate-pulse rounded-[18px] bg-stone-200/80" />
            <div className="h-64 animate-pulse rounded-[18px] bg-stone-200/80" />
            <div className="h-36 animate-pulse rounded-[18px] bg-stone-200/80" />
          </div>
        ) : loadError && !details ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
            <p className="font-bold">Không thể tải chi tiết mẻ</p>
            <p className="mt-1">{loadError}</p>
            <button
              className="mt-4 rounded-xl bg-red-700 px-4 py-2 font-bold text-white transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              onClick={() => {
                setIsLoading(true);
                void loadDetails();
              }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : details ? (
          <>
            {loadError && (
              <p
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                role="status"
              >
                Dữ liệu đang hiển thị có thể chưa phải bản mới nhất. {loadError}
              </p>
            )}

            <section className="overflow-hidden rounded-[18px] border border-stone-200/90 bg-white shadow-[0_8px_30px_rgba(41,37,36,0.06)]">
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-[#9f4b2e] uppercase">
                      Công đoạn hiện tại · Bước {currentStageIndex + 1}/
                      {WORKFLOW_STAGES.length}
                    </p>
                    <h3 className="mt-1 text-xl font-bold tracking-tight text-[#1c1917] sm:text-2xl">
                      {getStageLabel(details.batch.currentStage)}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${STAGE_STYLES[details.batch.currentStage]}`}
                    >
                      {details.batch.currentStage === Stage.COMPLETED
                        ? "Đã hoàn thành"
                        : "Đang thực hiện"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${PRIORITY_STYLES[details.batch.priority]}`}
                    >
                      Ưu tiên {PRIORITY_LABELS[details.batch.priority]}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-stone-500">
                    <span>Tiến độ quy trình</span>
                    <span>
                      {Math.round(
                        ((currentStageIndex + 1) / WORKFLOW_STAGES.length) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div
                    aria-label={`Tiến độ: ${getStageLabel(details.batch.currentStage)}`}
                    aria-valuemax={WORKFLOW_STAGES.length}
                    aria-valuemin={1}
                    aria-valuenow={currentStageIndex + 1}
                    className="h-1.5 overflow-hidden rounded-full bg-stone-100"
                    role="progressbar"
                  >
                    <div
                      className="h-full rounded-full bg-[#9f4b2e] transition-[width] duration-300"
                      style={{
                        width: `${((currentStageIndex + 1) / WORKFLOW_STAGES.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-2 grid grid-cols-8 gap-1"
                  >
                    {WORKFLOW_STAGES.map((stage, index) => (
                      <span
                        className={`h-1 rounded-full ${
                          index <= currentStageIndex
                            ? "bg-[#9f4b2e]/65"
                            : "bg-stone-200"
                        }`}
                        key={stage}
                      />
                    ))}
                  </div>
                </div>

                <p className="mt-4 border-l-2 border-[#9f4b2e]/35 pl-3 text-xs leading-5 text-stone-500">
                  {details.batch.priorityReason ?? "Không có ghi chú ưu tiên."}
                </p>
              </div>
              <div className="border-t border-stone-100 bg-[#fffdfa] p-4 sm:px-5">
                {nextStage ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
                        Hành động tiếp theo
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-stone-700">
                        {getStageLabel(details.batch.currentStage)}
                        <ArrowRight
                          aria-hidden="true"
                          className="mx-2 inline h-3.5 w-3.5 text-stone-300"
                        />
                        <span className="text-[#9f4b2e]">
                          {getStageLabel(nextStage)}
                        </span>
                      </p>
                    </div>
                    <button
                      className="min-h-11 shrink-0 rounded-xl bg-[#9f4b2e] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_16px_rgba(159,75,46,0.22)] transition hover:bg-[#873d25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={action !== null || !canCompleteQc}
                      onClick={handleTransition}
                      type="button"
                    >
                      {action === "transition"
                        ? "Đang chuyển công đoạn..."
                        : "Hoàn thành công đoạn"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm font-semibold text-emerald-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                      <CircleCheck
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>
                    Quy trình sản xuất đã hoàn thành.
                  </div>
                )}

                {!canCompleteQc && (
                  <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-medium leading-5 text-violet-700">
                    Hãy gửi và kiểm tra ít nhất một kết quả kiểm định trước khi
                    chuyển sang Đóng gói.
                  </p>
                )}

                {actionError && (
                  <p
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {actionError}
                  </p>
                )}
              </div>
            </section>

            {details.batch.currentStage === Stage.QC && (
              <QcForm
                batchQuantity={details.batch.quantity}
                isSubmitting={action === "qc"}
                onSubmit={handleQcSubmit}
              />
            )}

            <section className="rounded-[18px] border border-stone-200/90 bg-white p-4 shadow-[0_5px_20px_rgba(41,37,36,0.035)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-[#9f4b2e] uppercase">
                    Thông tin mẻ
                  </p>
                  <h3 className="mt-1 text-base font-bold text-[#1c1917]">
                    Thông số sản xuất
                  </h3>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">
                  AI đã phân tích
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-5 sm:grid-cols-2">
                <SpecItem label="Sản phẩm" value={details.batch.productName} />
                <SpecItem
                  label="Số lượng"
                  value={`${details.batch.quantity.toLocaleString("vi-VN")} sản phẩm`}
                />
                <SpecItem
                  label="Kích thước"
                  value={formatDimensions(
                    details.batch.heightCm,
                    details.batch.widthCm,
                  )}
                />
                <SpecItem
                  label="Họa tiết"
                  value={details.batch.pattern ?? "Không có"}
                />
                <SpecItem
                  label="Loại men"
                  value={details.batch.glazeType ?? "Chưa xác định"}
                />
                <SpecItem
                  label="Nhiệt độ nung"
                  value={formatMetric(
                    details.batch.firingTemperatureC,
                    "°C",
                  )}
                />
                <SpecItem
                  label="Đất sét ước tính"
                  value={formatMetric(details.batch.estimatedClayKg, "kg")}
                />
                <SpecItem
                  label="Men ước tính"
                  value={formatMetric(details.batch.estimatedGlazeKg, "kg")}
                />
                <SpecItem
                  label="Thời gian nung"
                  value={formatMetric(
                    details.batch.estimatedFiringHours,
                    "giờ",
                  )}
                />
                <SpecItem
                  label="Hạn hoàn thành"
                  value={`${details.batch.deadlineDays} ngày`}
                />
              </dl>

              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
                  Yêu cầu ban đầu
                </p>
                <blockquote className="mt-2 border-l-2 border-stone-200 pl-3 text-sm leading-6 text-stone-600">
                  {details.batch.rawDescription}
                </blockquote>
              </div>

              {assumptions.length > 0 && (
                <details className="group mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-amber-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
                    <span>Giả định của AI ({assumptions.length})</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-amber-700 transition group-open:rotate-180"
                    />
                  </summary>
                  <ul className="space-y-1.5 border-t border-amber-200/60 px-3 py-3 text-xs leading-5 text-amber-950">
                    {assumptions.map((assumption, index) => (
                      <li className="flex gap-2" key={`${assumption}-${index}`}>
                        <span aria-hidden="true" className="text-amber-600">
                          •
                        </span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>

            {details.qcReports.length > 0 && (
              <section className="rounded-[18px] border border-stone-200/90 bg-white p-4 shadow-[0_5px_20px_rgba(41,37,36,0.035)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-violet-700 uppercase">
                      Kiểm định chất lượng
                    </p>
                    <h3 className="mt-1 text-base font-bold text-[#1c1917]">
                      Kết quả kiểm định
                    </h3>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">
                    {details.qcReports.length} báo cáo
                  </span>
                </div>
                <div className="mt-3 divide-y divide-stone-100">
                  {details.qcReports.map((report, index) => {
                    const hasDefects = report.defectQuantity > 0;

                    return (
                      <article className="py-4 first:pt-2 last:pb-0" key={report.id}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                                hasDefects
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {hasDefects ? (
                                <TriangleAlert
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              ) : (
                                <CircleCheck
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              )}
                            </span>
                            <div>
                              <p
                                className={`text-sm font-bold ${hasDefects ? "text-red-800" : "text-emerald-800"}`}
                              >
                                {hasDefects
                                  ? "Phát hiện sản phẩm lỗi"
                                  : "Đạt yêu cầu kiểm định"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-stone-400">
                                {formatDateTime(report.createdAt)}
                              </p>
                            </div>
                          </div>
                          {index === 0 && (
                            <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[9px] font-bold tracking-wide text-stone-500 uppercase">
                              Mới nhất
                            </span>
                          )}
                        </div>
                        <dl className="mt-3 grid grid-cols-3 divide-x divide-stone-100 rounded-xl bg-stone-50 py-2.5 text-center">
                          <div className="px-2">
                            <dt className="text-[9px] font-semibold tracking-wide text-stone-400 uppercase">
                              Kiểm tra
                            </dt>
                            <dd className="mt-0.5 text-sm font-bold text-stone-800">
                              {report.inspectedQuantity}
                            </dd>
                          </div>
                          <div className="px-2">
                            <dt className="text-[9px] font-semibold tracking-wide text-stone-400 uppercase">
                              Đạt
                            </dt>
                            <dd className="mt-0.5 text-sm font-bold text-emerald-700">
                              {report.passedQuantity}
                            </dd>
                          </div>
                          <div className="px-2">
                            <dt className="text-[9px] font-semibold tracking-wide text-stone-400 uppercase">
                              Lỗi
                            </dt>
                            <dd className="mt-0.5 text-sm font-bold text-red-700">
                              {report.defectQuantity}
                              <span className="ml-1 text-[10px] font-semibold text-stone-400">
                                {Number(report.defectRate.toFixed(2))}%
                              </span>
                            </dd>
                          </div>
                        </dl>
                        {(report.defectType || report.notes) && (
                          <div className="mt-2.5 text-xs leading-5 text-stone-600">
                            {report.defectType && (
                              <p>
                                <span className="font-semibold text-stone-700">
                                  Loại lỗi:
                                </span>{" "}
                                {report.defectType}
                              </p>
                            )}
                            {report.notes && <p className="mt-0.5">{report.notes}</p>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="rounded-[18px] border border-stone-200/90 bg-white p-4 shadow-[0_5px_20px_rgba(41,37,36,0.035)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-stone-400 uppercase">
                    Nhật ký hệ thống
                  </p>
                  <h3 className="mt-1 text-base font-bold text-[#1c1917]">
                    Lịch sử hoạt động
                  </h3>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-500">
                  {details.logs.length} sự kiện
                </span>
              </div>
              <ol className="mt-4">
                {[...details.logs].reverse().map((log, index) => (
                  <li className="relative flex gap-3 pb-4 last:pb-0" key={log.id}>
                    {index < details.logs.length - 1 && (
                      <span className="absolute top-2.5 bottom-0 left-[4px] w-px bg-stone-200" />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${
                        log.eventType === EventType.NOTIFICATION_FAILED
                          ? "bg-red-500"
                          : log.eventType === EventType.QC_REPORTED
                            ? "bg-violet-500"
                            : log.eventType === EventType.TELEGRAM_SENT
                              ? "bg-emerald-500"
                              : "bg-[#9f4b2e]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-[10px] font-semibold tracking-wide text-stone-500 uppercase">
                          {EVENT_LABELS[log.eventType]}
                        </span>
                        <time className="text-[10px] text-stone-400">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-stone-600">
                        {log.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        ) : null}
      </div>
    </DialogShell>
  );
}
