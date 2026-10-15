import Link from "next/link";
import { redirect } from "next/navigation";
import { accountState } from "@/lib/session";
import { workspacePath, type AccountType } from "@/lib/account";
import { AuthShell } from "./auth-shell";
import { CompleteAccount } from "./complete-account";
export async function CompletePage({type}: {type:AccountType}) {
 const state = await accountState();
 if (state.state === "ready") redirect(workspacePath(state.account.accountType));
 if (state.state === "signed_out" || state.state === "unconfigured") redirect(`${workspacePath(type)}/sign-up`);
 return <AuthShell type={type}><span className="eyebrow">ONE LAST INTRODUCTION</span><h2>Make yourself at home.</h2><p className="auth-intro">Confirm your details to finish creating your {type} account.</p>{state.state === "setup_required" ? <CompleteAccount type={type}/> : <div className="notice" role="alert"><p>Account services are temporarily unavailable. Your account type has not been changed.</p><Link href={`${workspacePath(type)}/complete`}>Try again</Link></div>}</AuthShell>;
}
