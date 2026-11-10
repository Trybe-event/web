export function EmailConfirmation({ email }: { email: string }) {
  return (
    <div className="space-y-3">
      <p className="eyebrow">ONE LAST STEP</p>
      <h2>Check your email</h2>
      <p className="text-sm leading-relaxed text-muted">
        We sent a verification email to{" "}
        <strong className="break-all font-semibold text-ink">{email}</strong>.
        Open it and enter the code below to verify your account.
      </p>
    </div>
  );
}
