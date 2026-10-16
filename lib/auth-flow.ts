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

// authenticationDestination chooses where a finished Clerk attempt lands. An attendee
// who arrived from an event carries that event with them (web#7, web#8): a new account
// keeps it into the completion step, and a returning one goes back to the event itself.
// `eventSlug` is validated by the calling page (parseEventParam in lib/routes), and the
// query is written here rather than imported so this policy module stays dependency
// free for its test harness.
export function authenticationDestination(
  base: string,
  signingUp: boolean,
  pendingTask: boolean,
  eventSlug?: string,
) {
  if (pendingTask)
    throw new Error(
      "Your session requires an additional security step. Please contact support before continuing.",
    );
  if (!eventSlug) return signingUp ? `${base}/complete` : base;
  return signingUp
    ? `${base}/complete?event=${encodeURIComponent(eventSlug)}`
    : `/${encodeURIComponent(eventSlug)}`;
}
