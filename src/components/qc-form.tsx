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
      className="rounded-[18px] border border-[#e4d8cf] bg-[#fffdf9] p-4 shadow-[0_8px_28px_rgba(61,43,32,0.05)] sm:p-5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#eee5de] pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efe2d8] text-xs font-black text-[#8d4128]">
            QC
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#9f4b2e] uppercase">
              Kiểm định chất lượng
            </p>
            <h3 className="mt-0.5 text-base font-bold text-[#1c1917]">
              Gửi kết quả kiểm định
            </h3>
          </div>
        </div>
        <span className="rounded-full border border-[#e4d8cf] bg-[#faf6f1] px-2.5 py-1 text-[10px] font-bold whitespace-nowrap text-stone-600">
          Tổng mẻ: {batchQuantity.toLocaleString("vi-VN")}
        </span>
      </div>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-stone-700">
          Số lượng kiểm tra
          <input
            className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dcd2ca] bg-white px-3 py-2 text-sm font-semibold text-[#29231f] outline-none transition focus:border-[#9f4b2e] focus:ring-3 focus:ring-[#ecd8ce] disabled:bg-stone-50"
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
        <label className="text-xs font-bold text-stone-700">
          Số lượng lỗi
          <input
            className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dcd2ca] bg-white px-3 py-2 text-sm font-semibold text-[#29231f] outline-none transition focus:border-[#9f4b2e] focus:ring-3 focus:ring-[#ecd8ce] disabled:bg-stone-50"
            disabled={isSubmitting}
            inputMode="numeric"
            min={0}
            onChange={(event) => setDefectQuantity(event.target.value)}
            required
            type="number"
            value={defectQuantity}
          />
        </label>
        <label className="text-xs font-bold text-stone-700 sm:col-span-2">
          Loại lỗi
          <input
            className="mt-1.5 min-h-10 w-full rounded-xl border border-[#dcd2ca] bg-white px-3 py-2 text-sm font-normal text-[#29231f] outline-none transition placeholder:text-stone-400 focus:border-[#9f4b2e] focus:ring-3 focus:ring-[#ecd8ce] disabled:bg-stone-50"
            disabled={isSubmitting}
            maxLength={200}
            onChange={(event) => setDefectType(event.target.value)}
            placeholder="Ví dụ: Nứt men, cong vênh, sai màu..."
            type="text"
            value={defectType}
          />
        </label>
        <label className="text-xs font-bold text-stone-700 sm:col-span-2">
          Ghi chú
          <textarea
            className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-[#dcd2ca] bg-white px-3 py-2.5 text-sm font-normal leading-5 text-[#29231f] outline-none transition placeholder:text-stone-400 focus:border-[#9f4b2e] focus:ring-3 focus:ring-[#ecd8ce] disabled:bg-stone-50"
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
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700"
          role="alert"
        >
          {validationError}
        </p>
      )}

      <button
        className="mt-3.5 min-h-10 w-full rounded-xl bg-[#9f4b2e] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_14px_rgba(120,50,29,0.2)] transition hover:bg-[#873d26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9f4b2e] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Đang gửi kết quả..." : "Gửi kết quả QC"}
      </button>
    </form>
  );
}
