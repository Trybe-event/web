import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "./cn";

const control =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-danger";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
};

// Field renders a visible label, an optional hint and an error, and wires their ids
// into the control so screen readers announce them.
export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted">(optional)</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "min-h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(control, "min-h-11", className)} {...rest} />;
}
