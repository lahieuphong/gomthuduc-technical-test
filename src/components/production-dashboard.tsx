"use client";

import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Stage } from "@/generated/prisma/enums";
import { apiRequest } from "@/lib/api-client";
import type { AIUsageSummary, BatchRecord } from "@/types/api";
import { AIUsagePanel } from "@/components/ai-usage-panel";
import { BatchDetailDrawer } from "@/components/batch-detail-drawer";
import { CreateBatchModal } from "@/components/create-batch-modal";
import { KanbanBoard } from "@/components/kanban-board";

const DASHBOARD_POLL_INTERVAL_MS = 2_000;

type ToastKind = "success" | "warning" | "error";

type ToastState = {
  id: number;
  kind: ToastKind;
  message: string;
};

const TOAST_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-800 bg-emerald-950 text-emerald-50",
  warning: "border-amber-700 bg-amber-950 text-amber-50",
  error: "border-red-700 bg-red-950 text-red-50",
};

const TOAST_ICONS = {
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
} as const satisfies Record<ToastKind, typeof CircleCheck>;

export function ProductionDashboard() {
  const latestRequestIdRef = useRef(0);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [aiUsage, setAIUsage] = useState<AIUsageSummary | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  const closeCreateModal = useCallback(() => setIsCreateOpen(false), []);
  const closeDetailDrawer = useCallback(() => setSelectedBatchId(null), []);

  const loadBatches = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;

    try {
      const [batchesResult, usageResult] = await Promise.all([
        apiRequest<BatchRecord[]>("/api/batches"),
        apiRequest<AIUsageSummary>("/api/ai-usage").catch(() => null),
      ]);

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setBatches(batchesResult.data);
      if (usageResult) {
        setAIUsage(usageResult.data);
      }
      setLastUpdated(new Date());
      setLoadError(null);
    } catch (requestError: unknown) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setLoadError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách mẻ sản xuất.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let pollingId: number | undefined;

    const poll = async () => {
      await loadBatches();

      if (isActive) {
        pollingId = window.setTimeout(() => {
          void poll();
        }, DASHBOARD_POLL_INTERVAL_MS);
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
  }, [loadBatches]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 4_500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const statistics = useMemo(
    () => [
      {
        label: "Tổng mẻ",
        value: batches.length,
        accent: "bg-stone-900",
        caption: "Trong hệ thống",
      },
      {
        label: "Đang sản xuất",
        value: batches.filter(
          (batch) => batch.currentStage !== Stage.COMPLETED,
        ).length,
        accent: "bg-sky-600",
        caption: "Đang vận hành",
      },
      {
        label: "Đang nung",
        value: batches.filter((batch) => batch.currentStage === Stage.FIRING)
          .length,
        accent: "bg-orange-600",
        caption: "Trong lò",
      },
      {
        label: "Đang kiểm định",
        value: batches.filter((batch) => batch.currentStage === Stage.QC)
          .length,
        accent: "bg-violet-600",
        caption: "Chờ kiểm định",
      },
      {
        label: "Hoàn thành",
        value: batches.filter(
          (batch) => batch.currentStage === Stage.COMPLETED,
        ).length,
        accent: "bg-emerald-700",
        caption: "Đã hoàn tất",
      },
    ],
    [batches],
  );

  const handleCreated = useCallback(
    (batch: BatchRecord) => {
      setIsCreateOpen(false);
      showToast("success", `Đã tạo mẻ ${batch.code} thành công.`);
      void loadBatches();
    },
    [loadBatches, showToast],
  );
  const ToastIcon = toast ? TOAST_ICONS[toast.kind] : null;

  return (
    <main className="min-h-screen text-stone-900">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-480 items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-stone-950 shadow-[0_4px_12px_rgb(28_25_23/16%)] ring-1 ring-[#b7791f]/20">
              <Image
                alt=""
                className="size-8.5 object-contain"
                height={34}
                src="/gom-thu-duc-logo-gold.png"
                width={34}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="hidden text-[10px] font-bold tracking-[0.18em] text-accent uppercase sm:block">
                  Sản xuất gốm
                </p>
                <span className="hidden h-1 w-1 rounded-full bg-stone-300 sm:block" />
                <p className="hidden text-[10px] font-semibold text-stone-400 sm:block">
                  Điều phối sản xuất
                </p>
              </div>
              <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-stone-950 sm:text-[23px]">
                Gốm Production Pipeline
              </h1>
              <p className="mt-0.5 hidden text-[11px] text-stone-500 sm:block">
                Điều phối &amp; giám sát quy trình sản xuất
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 text-[11px] font-medium text-stone-500 lg:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Hệ thống đang hoạt động
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_14px_rgb(159_75_46/20%)] transition hover:bg-[#843d26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4 sm:text-sm"
              onClick={() => {
                setSelectedBatchId(null);
                setIsCreateOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo mẻ sản xuất</span>
              <span className="sm:hidden">Tạo mẻ</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-480 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <section
          aria-label="Thống kê sản xuất"
          className="overflow-hidden rounded-[18px] border border-[#ddd7ce] bg-[#ddd7ce] shadow-[0_1px_2px_rgb(28_25_23/4%)]"
        >
          <div className="flex flex-col gap-1 bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                Tổng quan hôm nay
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-stone-900">
                Tình hình sản xuất
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-stone-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Tự động cập nhật mỗi 2 giây
              {lastUpdated
                ? ` · ${new Intl.DateTimeFormat("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(lastUpdated)}`
                : ""}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px md:grid-cols-5">
            {statistics.map((statistic) => (
              <article
                className="last:col-span-2 flex min-h-18 items-center justify-between gap-3 bg-surface px-4 py-3 md:last:col-span-1"
                key={statistic.label}
              >
                <div className="min-w-0">
                  <span className="block truncate text-[10px] font-bold tracking-[0.08em] text-stone-500 uppercase">
                    {statistic.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-stone-400">
                    {statistic.caption}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-[-0.04em] text-stone-950 tabular-nums">
                  {statistic.value.toLocaleString("vi-VN")}
                </p>
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${statistic.accent}`}
                />
              </article>
            ))}
          </div>
        </section>

        <AIUsagePanel usage={aiUsage} />

        <section className="mt-5" aria-labelledby="kanban-title">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-accent uppercase">
                Luồng sản xuất
              </p>
              <h2
                className="mt-0.5 text-xl font-bold tracking-[-0.02em] text-stone-950"
                id="kanban-title"
              >
                Tiến độ theo công đoạn
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-stone-500 2xl:hidden">
              <span aria-hidden="true">Kéo ngang để xem toàn bộ quy trình</span>
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 text-accent"
              />
            </div>
          </div>

          {loadError && batches.length > 0 && (
            <div
              className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <span>Dữ liệu gần nhất vẫn được giữ. {loadError}</span>
              <button
                className="font-bold underline underline-offset-2"
                onClick={() => void loadBatches()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          )}

          {isInitialLoading && batches.length === 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="h-48 animate-pulse rounded-2xl bg-stone-200 motion-reduce:animate-none"
                  key={index}
                />
              ))}
            </div>
          ) : loadError && batches.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
              <p className="font-bold">Không thể tải bảng điều phối</p>
              <p className="mt-1 text-sm">{loadError}</p>
              <button
                className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                onClick={() => void loadBatches()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="kanban-viewport overflow-x-auto overscroll-x-contain">
              <KanbanBoard
                batches={batches}
                onSelectBatch={(id) => {
                  setIsCreateOpen(false);
                  setSelectedBatchId(id);
                }}
              />
            </div>
          )}
        </section>
      </div>

      {isCreateOpen && (
        <CreateBatchModal
          onClose={closeCreateModal}
          onCreated={handleCreated}
        />
      )}

      {selectedBatchId && (
        <BatchDetailDrawer
          batchId={selectedBatchId}
          key={selectedBatchId}
          onClose={closeDetailDrawer}
          onMutated={loadBatches}
          onToast={showToast}
        />
      )}

      {toast && (
        <div
          aria-live="polite"
          className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-70 rounded-xl border px-4 py-3 text-sm font-semibold shadow-[0_14px_40px_rgb(28_25_23/22%)] sm:right-6 sm:left-auto sm:max-w-md ${TOAST_STYLES[toast.kind]}`}
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <div className="flex items-start gap-3">
            {ToastIcon && (
              <ToastIcon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
            )}
            <span>{toast.message}</span>
            <button
              aria-label="Đóng thông báo"
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
              onClick={() => setToast(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
