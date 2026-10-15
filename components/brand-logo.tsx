import { cn } from "@/lib/utils";

/** Minimal Trybe wordmark. The full animated mark lives in the marketing site. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-brand text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      <span aria-hidden="true" className="mr-2 text-[32px] leading-none">✳</span>trybe<span className="text-lime">.</span>
    </span>
  );
}
