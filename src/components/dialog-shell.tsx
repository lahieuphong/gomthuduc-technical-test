"use client";

import { useEffect, type ReactNode } from "react";

type DialogShellProps = {
  labelledBy: string;
  variant: "modal" | "drawer";
  onClose: () => void;
  children: ReactNode;
};

export function DialogShell({
  labelledBy,
  variant,
  onClose,
  children,
}: DialogShellProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-[#1c1917]/55 p-0 backdrop-blur-[3px] ${
        variant === "modal"
          ? "items-end justify-center sm:items-center sm:p-6"
          : "justify-end"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={
          variant === "modal"
            ? "max-h-[96dvh] w-full overscroll-contain overflow-y-auto rounded-t-[22px] border border-[#e8ded5] bg-[#fffdf9] shadow-[0_-12px_50px_rgba(28,25,23,0.2)] sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-[22px] sm:shadow-[0_24px_80px_rgba(28,25,23,0.24)]"
            : "h-full w-full overscroll-contain overflow-y-auto border-l border-[#e4d9d0] bg-[#f8f4ee] shadow-[-16px_0_60px_rgba(28,25,23,0.2)] sm:max-w-2xl"
        }
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
