import Link from "next/link";
import type { ReactNode } from "react";

function policyLinks(lead: ReactNode) {
  return (
    <>
      {lead}, you agree to Trybe&apos;s{" "}
      <Link
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline underline-offset-4"
      >
        Terms
      </Link>{" "}
      and acknowledge our{" "}
      <Link
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline underline-offset-4"
      >
        Privacy Policy
      </Link>
      .
    </>
  );
}

// TermsConsent is the sign-up agreement the person must tick before an account is
// created. It records nothing by itself; the form refuses to submit until it is ticked.
export function TermsConsent({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "terms-consent-error" : undefined}
          required
        />
        <span className="font-medium">
          {policyLinks("By creating an account")}
        </span>
      </label>
      {error && (
        <p id="terms-consent-error" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function LegalNotice({
  action = "signup",
}: {
  action?: "signup" | "join";
}) {
  return (
    <p className="text-sm leading-relaxed text-muted">
      By{" "}
      {action === "join"
        ? "confirming and joining this event"
        : "creating an account"}
      , you agree to Trybe&apos;s{" "}
      <Link
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline underline-offset-4"
      >
        Terms
      </Link>{" "}
      and acknowledge our{" "}
      <Link
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline underline-offset-4"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
