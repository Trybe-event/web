"use client";

import { useId } from "react";

type SwitchProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

// Switch is an accessible on/off control (role="switch") with a visible label.
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-semibold">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="text-sm text-muted">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line transition-colors aria-checked:bg-ink disabled:opacity-60 bg-line/70"
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-full bg-surface shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
