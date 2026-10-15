import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { workspacePath, type AccountType } from "@/lib/account";
import { getSession } from "@/lib/session";

import { AuthShell } from "./auth-shell";
import { CompleteAccount } from "./complete-account";

export async function CompletePage({ type }: { type: AccountType }) {
  const s = await getSession();
  if (s.kind === "bound") redirect(workspacePath(s.account.type));
  if (s.kind === "signed-out" || s.kind === "unconfigured")
    redirect(`${workspacePath(type)}/sign-up`);
  const user = s.kind === "unbound" ? await currentUser() : null;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return (
    <AuthShell type={type}>
      <span className="eyebrow">ONE LAST INTRODUCTION</span>
      <h2>Make yourself at home.</h2>
      <p className="auth-intro">
        Confirm your details to finish creating your {type} account.
      </p>
      {s.kind === "unbound" ? (
        <CompleteAccount type={type} defaultName={name} />
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
