// Choose the next secure step without treating a partial Clerk attempt as signed in.
export function signInStep(status: string | null, strategies: string[]) {
  if (status === "complete") return "complete";
  if (status === "needs_new_password") return "new-password";
  if (status === "needs_second_factor" || status === "needs_client_trust") {
    if (strategies.includes("email_code")) return "email";
    if (strategies.includes("totp")) return "totp";
    if (strategies.includes("phone_code")) return "phone";
  }
  throw new Error(
    "Additional account verification is required. Please contact support.",
  );
}

export function authenticationDestination(
  base: string,
  signingUp: boolean,
  pendingTask: boolean,
) {
  if (pendingTask)
    throw new Error(
      "Your session requires an additional security step. Please contact support before continuing.",
    );
  return signingUp ? `${base}/complete` : base;
}
