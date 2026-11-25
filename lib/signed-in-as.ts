import type { AccountType } from "./account";

// signedInAs reports whether the session that just signed in may use this page's
// workspace. Only a bound account of another type is refused; a new sign-in without a
// Trybe account continues to that type's setup, and an outage is left to the
// workspace, which checks the account on the server anyway. Right after sign-in the
// session cookie may not be written yet, so the token is refreshed first and a 401 is
// retried: answering it with "allowed" let attendees through the organizer page.
export async function signedInAs(
  type: AccountType | "admin",
  refreshSession: () => Promise<unknown>,
  wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await refreshSession();
      const response = await fetch("/api/me/account", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 401) {
        await wait(400 * (attempt + 1));
        continue;
      }
      // 404: signed in without a Trybe account yet; setup follows for this type.
      if (!response.ok) return true;
      const account = (await response.json()) as { type?: string };
      return !account.type || account.type === type;
    } catch {
      return true;
    }
  }
  // Still not recognised: refuse rather than guess.
  return false;
}
