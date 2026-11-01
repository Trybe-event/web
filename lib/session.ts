// Server-side account resolution for pages. The account type comes from the API's
// database binding (GET /me/account), never from Clerk metadata.
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { components } from "./api/schema";
import { serverApi } from "./api/server";
import { isAccountType, workspacePath, type AccountType } from "./account";
import { authConfigured } from "./auth-config";

export type Account = components["schemas"]["Account"];

export type SessionState =
  | { kind: "unconfigured" } // Clerk keys not set
  | { kind: "signed-out" }
  | { kind: "unbound" } // signed in, no Trybe account type chosen yet
  | { kind: "unavailable" } // the API couldn't be reached
  | { kind: "bound"; account: Account };

export async function getSession(): Promise<SessionState> {
  if (!authConfigured()) return { kind: "unconfigured" };
  const { userId } = await auth();
  if (!userId) return { kind: "signed-out" };
  try {
    const accountApiClient = await serverApi();
    const {
      data: boundAccount,
      error: accountLookupError,
      response: accountResponse,
    } = await accountApiClient.GET("/me/account", {
      signal: AbortSignal.timeout(8000),
    });
    if (
      boundAccount &&
      (isAccountType(boundAccount.type) || boundAccount.type === "admin")
    )
      return { kind: "bound", account: boundAccount as Account };
    if (
      accountResponse.status === 404 &&
      accountLookupError?.code === "not_found"
    )
      return { kind: "unbound" };
    // Clerk already confirmed the session. An upstream 401 is an integration
    // failure, not a reason to bounce this person back through sign-in.
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * requireAccount lets a page render only for the given account type. Signed-out
 * visitors go to that type's sign-in, sessions without an account type go to setup,
 * and the other account type goes back to its own workspace.
 */
export async function requireAccount(
  type: AccountType,
): Promise<
  { account: Account & { type: AccountType } } | { unavailable: true }
> {
  const sessionState = await getSession();
  if (
    sessionState.kind === "unconfigured" ||
    sessionState.kind === "signed-out"
  )
    redirect(`${workspacePath(type)}/sign-in`);
  if (sessionState.kind === "unbound") redirect("/account/setup");
  if (sessionState.kind === "unavailable") return { unavailable: true };
  if (sessionState.account.type !== type)
    redirect(workspacePath(sessionState.account.type));
  return { account: sessionState.account as Account & { type: AccountType } };
}
