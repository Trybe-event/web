import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export interface AuthPlaceholderProps {
  roleLabel: string;
  mode: "sign-in" | "sign-up";
  backHref: string;
}

/**
 * Placeholder for the Clerk-hosted auth surfaces. Milestone 1 implementation
 * replaces this with the Clerk component for the matching account type, inside
 * the separate organizer and attendee flows (PRD section 40).
 */
export function AuthPlaceholder({
  roleLabel,
  mode,
  backHref,
}: AuthPlaceholderProps) {
  const title = mode === "sign-in" ? "Sign in" : "Create account";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <Link href="/" className="self-start">
        <BrandLogo />
      </Link>
      <div className="rounded-xl border border-line p-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {roleLabel}
        </span>
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Authentication is wired to Clerk during Milestone 1. This placeholder
          marks where the {roleLabel.toLowerCase()} {title.toLowerCase()} form
          renders, bound to a single immutable account type and enforced by the
          Go API.
        </p>
        <Link
          href={backHref}
          className="mt-5 inline-block text-sm font-semibold underline underline-offset-4"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
