import Link from "next/link";

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
