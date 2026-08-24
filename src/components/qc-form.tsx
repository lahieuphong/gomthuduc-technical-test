"use client";

import { useState, type FormEvent } from "react";

import type { QcReportInput } from "@/types/api";

type QcFormProps = {
  batchQuantity: number;
  isSubmitting: boolean;
  onSubmit: (input: QcReportInput) => Promise<void>;
};

export function QcForm({
  batchQuantity,
  isSubmitting,
  onSubmit,
}: QcFormProps) {
  const [inspectedQuantity, setInspectedQuantity] = useState(
    String(batchQuantity),
  );
  const [defectQuantity, setDefectQuantity] = useState("0");
  const [defectType, setDefectType] = useState("");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const inspected = Number(inspectedQuantity);
    const defects = Number(defectQuantity);

    if (!Number.isInteger(inspected) || inspected <= 0) {
      setValidationError("Số lượng kiểm tra phải là số nguyên dương.");
      return;
    }

    if (inspected > batchQuantity) {
      setValidationError(
        "Số lượng kiểm tra không được vượt quá tổng số lượng của mẻ.",
      );
      return;
    }

    if (!Number.isInteger(defects) || defects < 0 || defects > inspected) {
      setValidationError(
        "Số lượng lỗi phải từ 0 đến số lượng đã kiểm tra.",
      );
      return;
    }

    setValidationError(null);

    await onSubmit({
      inspectedQuantity: inspected,
      defectQuantity: defects,
      defectType: defectType.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <form
      className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-violet-700 uppercase">
            Quality Control
          </p>
          <h3 className="mt-1 text-base font-bold text-stone-900">
            Gửi kết quả kiểm định
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700 shadow-sm">
          Tổng mẻ: {batchQuantity.toLocaleString("vi-VN")}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-stone-700">
          Số lượng kiểm tra
          <input
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
            disabled={isSubmitting}
            inputMode="numeric"
            max={batchQuantity}
            min={1}
            onChange={(event) => setInspectedQuantity(event.target.value)}
            required
            type="number"
            value={inspectedQuantity}
          />
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Số lượng lỗi
          <input
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
            disabled={isSubmitting}
            inputMode="numeric"
            min={0}
            onChange={(event) => setDefectQuantity(event.target.value)}
            required
            type="number"
            value={defectQuantity}
          />
        </label>
        <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
          Loại lỗi
          <input
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
            disabled={isSubmitting}
            maxLength={200}
            onChange={(event) => setDefectType(event.target.value)}
            placeholder="Ví dụ: Nứt men, cong vênh, sai màu..."
            type="text"
            value={defectType}
          />
        </label>
        <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
          Ghi chú
          <textarea
            className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
            disabled={isSubmitting}
            maxLength={2000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ghi chú kiểm định hoặc yêu cầu xử lý..."
            value={notes}
          />
        </label>
      </div>

      {validationError && (
        <p
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          role="alert"
        >
          {validationError}
        </p>
      )}

      <button
        className="mt-4 min-h-11 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Đang gửi kết quả..." : "Gửi kết quả QC"}
      </button>
    </form>
  );
}
