import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export interface EntryPageProps {
  /** Display label for the account type, for example "Organizer". */
  roleLabel: string;
  /** One-line description of what this workspace does. */
  description: string;
  /** Route base for this account type, for example "/organizer". */
  base: string;
}

/**
 * Shared presentation for the organizer and attendee entry routes.
 * These are Milestone 1 placeholders: the sign-in and create-account actions
 * are wired to Clerk during Milestone 1 implementation. The account type is
 * decided and enforced by the Go API, never by the route alone.
 */
export function EntryPage({ roleLabel, description, base }: EntryPageProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <Link href="/" className="self-start">
        <BrandLogo />
      </Link>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {roleLabel} workspace
        </span>
        <h1 className="text-3xl font-bold">Welcome to Trybe</h1>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`${base}/sign-in`}
          className="rounded-lg bg-ink px-4 py-3 text-center text-sm font-semibold text-paper transition hover:-translate-y-0.5"
        >
          Sign in
        </Link>
        <Link
          href={`${base}/sign-up`}
          className="rounded-lg border border-line px-4 py-3 text-center text-sm font-semibold transition hover:border-ink"
        >
          Create a {roleLabel.toLowerCase()} account
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Free during the demo stage. {roleLabel} and the other account type are
        separate; this account cannot switch roles.
      </p>
    </main>
  );
}
