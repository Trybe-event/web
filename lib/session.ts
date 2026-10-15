// Server-side account resolution for pages. The account type comes from the API's
// database binding (GET /me/account), never from Clerk metadata.
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { components } from "./api/schema";
import { serverApi } from "./api/server";
import { isAccountType, workspacePath, type AccountType } from "./account";
import { authConfigured } from "./auth-config";

export type Account = components["schemas"]["Account"] & { type: AccountType };

export type SessionState =
  | { kind: "unconfigured" } // Clerk keys not set
  | { kind: "signed-out" }
  | { kind: "unbound" } // signed in, no Trybe account type chosen yet
  | { kind: "unavailable" } // the API couldn't be reached
  | { kind: "bound"; account: Account };

const MOCK_ACCOUNT: Account = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "attendee",
  full_name: "Mock Attendee",
  organization: null,
  created_at: new Date(0).toISOString(),
};

export async function getSession(): Promise<SessionState> {
  if (!authConfigured()) return { kind: "unconfigured" };
  const { userId } = await auth();
  if (!userId) return { kind: "signed-out" };
  if (
    process.env.NEXT_PUBLIC_API_MOCKS === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    // Server components can't reach browser mocks; act as an attendee in mock mode.
    return { kind: "bound", account: MOCK_ACCOUNT };
  }
  try {
    const api = await serverApi();
    const { data, response } = await api.GET("/me/account", {
      signal: AbortSignal.timeout(8000),
    });
    if (data && isAccountType(data.type))
      return { kind: "bound", account: data as Account };
    if (response.status === 404) return { kind: "unbound" };
    if (response.status === 401) return { kind: "signed-out" };
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
): Promise<{ account: Account } | { unavailable: true }> {
  const s = await getSession();
  if (s.kind === "unconfigured" || s.kind === "signed-out")
    redirect(`${workspacePath(type)}/sign-in`);
  if (s.kind === "unbound") redirect("/account/setup");
  if (s.kind === "unavailable") return { unavailable: true };
  if (s.account.type !== type) redirect(workspacePath(s.account.type));
  return { account: s.account };
}
