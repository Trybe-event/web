import Link from "next/link";
import { redirect } from "next/navigation";

import { workspacePath, type AccountType } from "@/lib/account";
import { getSession } from "@/lib/session";

import { AuthForm } from "./auth-form";
import { AuthShell } from "./auth-shell";

export async function AuthPage({
  type,
  mode,
}: {
  type: AccountType;
  mode: "sign-in" | "sign-up";
}) {
  const sessionState = await getSession();
  if (sessionState.kind === "bound")
    redirect(workspacePath(sessionState.account.type));
  if (sessionState.kind === "unbound") redirect("/account/setup");
  const isSignUp = mode === "sign-up";
  const workspaceRoute = workspacePath(type);
  return (
    <AuthShell type={type}>
      <span className="eyebrow">
        {type === "organizer" ? "ORGANIZER" : "ATTENDEE"} ACCOUNT
      </span>
      <h2>
        {isSignUp ? "Make room for possibility." : "Good to see you again."}
      </h2>
      <p className="auth-intro">
        {isSignUp
          ? `Create your ${type} account and get started.`
          : `Sign in to your ${type} workspace.`}
      </p>
      {sessionState.kind === "unconfigured" ? (
        <div className="auth-unavailable">
          <label htmlFor="preview-email">Email address</label>
          <input
            id="preview-email"
            type="email"
            disabled
            placeholder="you@example.com"
          />
          <label htmlFor="preview-password">Password</label>
          <input
            id="preview-password"
            type="password"
            disabled
            placeholder="Enter your password"
          />
          <button type="button" className="primary-button" disabled>
            {isSignUp ? "Create account" : "Sign in"}
          </button>
          <p role="status">
            Account access is being prepared. Please check back shortly.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="setup-note">
              Local setup: add Clerk keys to <code>.env.local</code>. No sign-in
              is simulated.
            </p>
          )}
        </div>
      ) : sessionState.kind === "unavailable" ? (
        <div className="notice" role="alert">
          <h3>We couldn&apos;t reach your workspace.</h3>
          <p>Your account has not been changed. Please try again shortly.</p>
          <Link href={`${workspaceRoute}/${mode}`}>Try again</Link>
        </div>
      ) : (
        <AuthForm type={type} mode={mode} />
      )}
      <p className="auth-alternative">
        {isSignUp ? "Already have an account?" : "New to Trybe?"}{" "}
        <Link href={`${workspaceRoute}/${isSignUp ? "sign-in" : "sign-up"}`}>
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </AuthShell>
  );
}
