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
      className={`fixed inset-0 z-50 flex bg-stone-950/45 p-0 backdrop-blur-[2px] ${
        variant === "modal"
          ? "items-end justify-center sm:items-center sm:p-5"
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
            ? "max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl"
            : "h-full w-full overflow-y-auto border-l border-stone-200 bg-[#fcfbf9] shadow-2xl sm:max-w-2xl"
        }
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
