"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Stage } from "@/generated/prisma/enums";
import { apiRequest } from "@/lib/api-client";
import type { BatchRecord } from "@/types/api";
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
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

export function ProductionDashboard() {
  const latestRequestIdRef = useRef(0);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
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
      const result = await apiRequest<BatchRecord[]>("/api/batches");

      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setBatches(result.data);
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
      },
      {
        label: "Đang sản xuất",
        value: batches.filter(
          (batch) => batch.currentStage !== Stage.COMPLETED,
        ).length,
        accent: "bg-sky-600",
      },
      {
        label: "Đang nung",
        value: batches.filter((batch) => batch.currentStage === Stage.FIRING)
          .length,
        accent: "bg-orange-600",
      },
      {
        label: "Đang QC",
        value: batches.filter((batch) => batch.currentStage === Stage.QC)
          .length,
        accent: "bg-violet-600",
      },
      {
        label: "Hoàn thành",
        value: batches.filter(
          (batch) => batch.currentStage === Stage.COMPLETED,
        ).length,
        accent: "bg-emerald-700",
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

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-2xl text-white shadow-sm">
              <span aria-hidden="true">🏺</span>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-amber-700 uppercase">
                Ceramics Manufacturing
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
                Gốm Production Pipeline
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Điều phối &amp; giám sát quy trình sản xuất
              </p>
            </div>
          </div>

          <button
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            onClick={() => {
              setSelectedBatchId(null);
              setIsCreateOpen(true);
            }}
            type="button"
          >
            + Tạo mẻ sản xuất
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section aria-label="Thống kê sản xuất">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {statistics.map((statistic) => (
              <article
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
                key={statistic.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold tracking-wide text-stone-500 uppercase">
                    {statistic.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${statistic.accent}`}
                  />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-stone-950">
                  {statistic.value.toLocaleString("vi-VN")}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="kanban-title">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-amber-700 uppercase">
                Luồng sản xuất
              </p>
              <h2
                className="mt-1 text-xl font-bold tracking-tight text-stone-950"
                id="kanban-title"
              >
                Bảng Kanban công đoạn
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-500"
              />
              <span>
                Tự động cập nhật mỗi 2 giây
                {lastUpdated
                  ? ` · ${new Intl.DateTimeFormat("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(lastUpdated)}`
                  : ""}
              </span>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="h-72 animate-pulse rounded-2xl bg-stone-200"
                  key={index}
                />
              ))}
            </div>
          ) : loadError && batches.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
              <p className="font-bold">Không thể tải dashboard</p>
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
            <div className="kanban-viewport lg:overflow-x-auto">
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
          className={`fixed right-4 bottom-4 z-[70] max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl sm:right-6 sm:bottom-6 ${TOAST_STYLES[toast.kind]}`}
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <div className="flex items-start gap-3">
            <span aria-hidden="true">
              {toast.kind === "success"
                ? "✓"
                : toast.kind === "warning"
                  ? "⚠"
                  : "!"}
            </span>
            <span>{toast.message}</span>
            <button
              aria-label="Đóng thông báo"
              className="ml-auto text-lg leading-none opacity-60 hover:opacity-100"
              onClick={() => setToast(null)}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
