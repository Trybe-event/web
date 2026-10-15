import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

export function Card({ className, ...rest }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-surface p-5", className)}
      {...rest}
    />
  );
}

type Tone = "neutral" | "accent" | "danger" | "success";
const tones: Record<Tone, string> = {
  neutral: "border-line bg-paper text-ink",
  accent: "border-transparent bg-lime text-lime-ink",
  danger: "border-transparent bg-danger-surface text-danger",
  success: "border-line bg-surface text-success",
};

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line/70", className)}
    />
  );
}

// Alert announces errors and status messages to assistive technology.
export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        tone === "danger"
          ? "border-danger/40 bg-danger-surface text-danger"
          : "border-line bg-surface text-success",
      )}
    >
      {children}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 48,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const style = { width: size, height: size };
  if (src) {
    // Signed storage URLs change per request, so next/image caching doesn't apply.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={style}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-lime font-display text-sm font-bold text-lime-ink"
    >
      {initials || "?"}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-display text-2xl font-extrabold tracking-tight",
        className,
      )}
    >
      <span aria-hidden="true" className="text-[1.2em] leading-none">
        ✳
      </span>
      <span>
        trybe<span className="text-accent-ink">.</span>
      </span>
    </span>
  );
}
