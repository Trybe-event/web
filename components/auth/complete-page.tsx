import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { workspacePath, type AccountType } from "@/lib/account";
import { routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";

import { AuthShell } from "./auth-shell";
import { CompleteAccount } from "./complete-account";

// The event being joined reaches this step through Clerk's redirect as ?event=<slug>
// (web#7), and is handed on to profile onboarding.
export async function CompletePage({
  type,
  eventSlug,
}: {
  type: AccountType;
  eventSlug?: string;
}) {
  const sessionState = await getSession();
  if (sessionState.kind === "bound")
    redirect(
      eventSlug && sessionState.account.type === "attendee"
        ? routes.eventLanding(eventSlug)
        : workspacePath(sessionState.account.type),
    );
  if (
    sessionState.kind === "signed-out" ||
    sessionState.kind === "unconfigured"
  )
    redirect(withEventParam(`${workspacePath(type)}/sign-up`, eventSlug));
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
        <CompleteAccount
          type={type}
          defaultName={fullName}
          eventSlug={eventSlug}
        />
      ) : (
        <div className="notice" role="alert">
          <p>
            Account services are temporarily unavailable. Your account type has
            not been changed.
          </p>
          <Link
            href={withEventParam(`${workspacePath(type)}/complete`, eventSlug)}
          >
            Try again
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
