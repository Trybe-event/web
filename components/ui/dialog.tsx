"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions: ReactNode;
  size?: "default" | "wide";
};

// Dialog uses the native <dialog> element: focus is trapped, Escape closes it, and
// focus returns to the opener when it closes.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  size = "default",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      className={`m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto ${size === "wide" ? "w-[min(60rem,calc(100vw-2rem))]" : "w-[min(32rem,calc(100vw-2rem))]"} rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-black/50`}
    >
      <h2 id={`${id}-title`} className="text-lg font-bold">
        {title}
      </h2>
      {description && (
        <p id={`${id}-desc`} className="mt-2 text-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>
    </dialog>
  );
}
