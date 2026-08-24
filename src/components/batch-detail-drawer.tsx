"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EventType, Priority, Stage } from "@/generated/prisma/enums";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { getNextStage, getStageLabel } from "@/lib/workflow";
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
  [Priority.LOW]: "bg-slate-100 text-slate-700",
  [Priority.MEDIUM]: "bg-amber-100 text-amber-800",
  [Priority.HIGH]: "bg-orange-100 text-orange-800",
  [Priority.URGENT]: "bg-red-100 text-red-800",
};

const EVENT_LABELS: Record<EventType, string> = {
  [EventType.BATCH_CREATED]: "Khởi tạo mẻ",
  [EventType.STAGE_TRANSITION]: "Chuyển công đoạn",
  [EventType.AI_ANALYZED]: "Phân tích AI",
  [EventType.QC_REPORTED]: "Báo cáo QC",
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
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5">
      <dt className="text-[10px] font-bold tracking-wide text-stone-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-stone-800">{value}</dd>
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
          "Kết quả QC đã được lưu nhưng gửi thông báo Telegram thất bại.",
        );
      } else {
        onToast("success", "Đã lưu kết quả kiểm định chất lượng.");
      }

      await Promise.all([loadDetails(), onMutated()]);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi kết quả QC.";

      setActionError(message);
      onToast("error", message);
      await loadDetails();
    } finally {
      setAction(null);
    }
  };

  const nextStage = details
    ? getNextStage(details.batch.currentStage)
    : null;
  const canCompleteQc =
    details?.batch.currentStage !== Stage.QC ||
    details.qcReports.length > 0;

  return (
    <DialogShell
      labelledBy="batch-detail-title"
      onClose={onClose}
      variant="drawer"
    >
      <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-amber-700 uppercase">
            Chi tiết mẻ sản xuất
          </p>
          <h2
            className="mt-1 truncate font-mono text-xl font-bold text-stone-950"
            id="batch-detail-title"
          >
            {details?.batch.code ?? "Đang tải..."}
          </h2>
        </div>
        <button
          aria-label="Đóng chi tiết"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-2xl leading-none text-stone-500 hover:bg-stone-100"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        {isLoading && !details ? (
          <div className="space-y-3" aria-label="Đang tải chi tiết">
            <div className="h-28 animate-pulse rounded-2xl bg-stone-200" />
            <div className="h-56 animate-pulse rounded-2xl bg-stone-200" />
            <div className="h-40 animate-pulse rounded-2xl bg-stone-200" />
          </div>
        ) : loadError && !details ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-bold">Không thể tải chi tiết mẻ</p>
            <p className="mt-1">{loadError}</p>
            <button
              className="mt-4 rounded-xl bg-red-700 px-4 py-2 font-bold text-white"
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
            <section className="rounded-2xl bg-stone-900 p-5 text-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">
                    Công đoạn hiện tại
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {getStageLabel(details.batch.currentStage)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${PRIORITY_STYLES[details.batch.priority]}`}
                >
                  Ưu tiên {PRIORITY_LABELS[details.batch.priority]}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-stone-300">
                {details.batch.priorityReason ?? "Không có ghi chú ưu tiên."}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold tracking-wide text-stone-900 uppercase">
                Mô tả đơn hàng
              </h3>
              <p className="mt-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700">
                {details.batch.rawDescription}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-bold tracking-wide text-stone-900 uppercase">
                Thông số đã phân tích
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  label="Deadline"
                  value={`${details.batch.deadlineDays} ngày`}
                />
              </dl>

              {assumptions.length > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-800 uppercase">
                    Giả định của AI
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-950">
                    {assumptions.map((assumption, index) => (
                      <li className="flex gap-2" key={`${assumption}-${index}`}>
                        <span aria-hidden="true">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {details.batch.currentStage === Stage.QC && (
              <QcForm
                batchQuantity={details.batch.quantity}
                isSubmitting={action === "qc"}
                onSubmit={handleQcSubmit}
              />
            )}

            {details.qcReports.length > 0 && (
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold tracking-wide text-stone-900 uppercase">
                    Kết quả QC
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">
                    {details.qcReports.length} báo cáo
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {details.qcReports.map((report, index) => {
                    const hasDefects = report.defectQuantity > 0;

                    return (
                      <article
                        className={`rounded-2xl border p-4 ${
                          hasDefects
                            ? "border-red-200 bg-red-50"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                        key={report.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`text-sm font-bold ${hasDefects ? "text-red-800" : "text-emerald-800"}`}
                            >
                              {hasDefects
                                ? "Cảnh báo có sản phẩm lỗi"
                                : "QC đạt yêu cầu"}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {formatDateTime(report.createdAt)}
                            </p>
                          </div>
                          {index === 0 && (
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-stone-600 uppercase shadow-sm">
                              Mới nhất
                            </span>
                          )}
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-white/80 p-2">
                            <dt className="text-[10px] text-stone-500">Kiểm tra</dt>
                            <dd className="mt-0.5 font-bold text-stone-900">
                              {report.inspectedQuantity}
                            </dd>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2">
                            <dt className="text-[10px] text-stone-500">Đạt</dt>
                            <dd className="mt-0.5 font-bold text-emerald-700">
                              {report.passedQuantity}
                            </dd>
                          </div>
                          <div className="rounded-xl bg-white/80 p-2">
                            <dt className="text-[10px] text-stone-500">Lỗi</dt>
                            <dd className="mt-0.5 font-bold text-red-700">
                              {report.defectQuantity} ({Number(report.defectRate.toFixed(2))}%)
                            </dd>
                          </div>
                        </dl>
                        {report.defectType && (
                          <p className="mt-3 text-sm text-stone-700">
                            <strong>Loại lỗi:</strong> {report.defectType}
                          </p>
                        )}
                        {report.notes && (
                          <p className="mt-1 text-sm leading-6 text-stone-600">
                            {report.notes}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
              <h3 className="text-sm font-bold tracking-wide text-stone-900 uppercase">
                Hoàn thành công đoạn
              </h3>
              {nextStage ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Backend sẽ xác nhận trạng thái hiện tại và tự chọn công đoạn
                    kế tiếp.
                  </p>
                  <button
                    className="mt-4 w-full rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      action !== null ||
                      !canCompleteQc
                    }
                    onClick={handleTransition}
                    type="button"
                  >
                    {action === "transition"
                      ? "Đang chuyển công đoạn..."
                      : `Hoàn thành ${getStageLabel(details.batch.currentStage)} → Chuyển sang ${getStageLabel(nextStage)}`}
                  </button>
                  {!canCompleteQc && (
                    <p className="mt-2 text-xs font-medium text-violet-700">
                      Hãy gửi và kiểm tra ít nhất một kết quả QC trước khi chuyển
                      sang Đóng gói.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  Quy trình sản xuất đã hoàn thành.
                </div>
              )}

              {actionError && (
                <p
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {actionError}
                </p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide text-stone-900 uppercase">
                  Timeline & Logs
                </h3>
                <span className="text-xs font-semibold text-stone-500">
                  {details.logs.length} sự kiện
                </span>
              </div>
              <ol className="mt-4 space-y-0">
                {[...details.logs].reverse().map((log, index) => (
                  <li className="relative flex gap-3 pb-5" key={log.id}>
                    {index < details.logs.length - 1 && (
                      <span className="absolute top-3 bottom-0 left-[5px] w-px bg-stone-200" />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white ring-1 ring-stone-300 ${
                        log.eventType === EventType.NOTIFICATION_FAILED
                          ? "bg-red-500"
                          : log.eventType === EventType.QC_REPORTED
                            ? "bg-violet-600"
                            : "bg-amber-600"
                      }`}
                    />
                    <div className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold tracking-wide text-stone-500 uppercase">
                          {EVENT_LABELS[log.eventType]}
                        </span>
                        <time className="text-[10px] text-stone-400">
                          {formatDateTime(log.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-stone-700">
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
