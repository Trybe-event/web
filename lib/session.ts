import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { authConfigured } from "./auth-config";
import { isAccountType, workspacePath, type AccountType } from "./account";

export interface ProductAccount {
  id: string; accountType: AccountType; fullName: string;
  organization: string; onboardingComplete: boolean;
}
export type AccountState =
  | { state: "unconfigured" | "signed_out" | "unavailable" | "setup_required" }
  | { state: "ready"; account: ProductAccount };

export async function accountState(): Promise<AccountState> {
  if (!authConfigured()) return { state: "unconfigured" };
  const session = await auth();
  if (!session.userId) return { state: "signed_out" };
  const token = await session.getToken();
  if (!token) return { state: "signed_out" };
  try {
    const response = await fetch(new URL("/v1/me", process.env.API_BASE_URL ?? "http://127.0.0.1:8080"), {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error",
    });
    if (response.status === 401) return { state: "signed_out" };
    if (!response.ok) return { state: "unavailable" };
    const data = await response.json();
    if (data.state === "setup_required") return { state: "setup_required" };
    if (data.state !== "ready" || !data.account || !isAccountType(data.account.accountType) || typeof data.account.id !== "string" || typeof data.account.fullName !== "string" || typeof data.account.onboardingComplete !== "boolean") return { state: "unavailable" };
    return { state: "ready", account: data.account as ProductAccount };
  } catch { return { state: "unavailable" }; }
}

export async function workspaceAccount(type: AccountType) {
  const state = await accountState();
  if (state.state === "signed_out" || state.state === "unconfigured") redirect(`${workspacePath(type)}/sign-in`);
  if (state.state === "setup_required") redirect("/account/setup");
  if (state.state === "ready" && state.account.accountType !== type) redirect(workspacePath(state.account.accountType));
  return state;
}
