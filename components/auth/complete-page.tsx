import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { workspacePath, type AccountType } from "@/lib/account";
import { getSession } from "@/lib/session";

import { AuthShell } from "./auth-shell";
import { CompleteAccount } from "./complete-account";

export async function CompletePage({ type }: { type: AccountType }) {
  const sessionState = await getSession();
  if (sessionState.kind === "bound")
    redirect(workspacePath(sessionState.account.type));
  if (
    sessionState.kind === "signed-out" ||
    sessionState.kind === "unconfigured"
  )
    redirect(`${workspacePath(type)}/sign-up`);
  const clerkUser =
    sessionState.kind === "unbound" ? await currentUser() : null;
  const fullName = [clerkUser?.firstName, clerkUser?.lastName]
    .filter(Boolean)
    .join(" ");
  return (
    <AuthShell type={type}>
      <span className="eyebrow">ONE LAST INTRODUCTION</span>
      <h2>Make yourself at home.</h2>
      <p className="auth-intro">
        Confirm your details to finish creating your {type} account.
      </p>
      {sessionState.kind === "unbound" ? (
        <CompleteAccount type={type} defaultName={fullName} />
      ) : (
        <div className="notice" role="alert">
          <p>
            Account services are temporarily unavailable. Your account type has
            not been changed.
          </p>
          <Link href={`${workspacePath(type)}/complete`}>Try again</Link>
        </div>
      )}
    </AuthShell>
  );
}
