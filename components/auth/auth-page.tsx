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
  const s = await getSession();
  if (s.kind === "bound") redirect(workspacePath(s.account.type));
  if (s.kind === "unbound") redirect("/account/setup");
  const signup = mode === "sign-up";
  const base = workspacePath(type);
  return (
    <AuthShell type={type}>
      <span className="eyebrow">
        {type === "organizer" ? "ORGANIZER" : "ATTENDEE"} ACCOUNT
      </span>
      <h2>
        {signup ? "Make room for possibility." : "Good to see you again."}
      </h2>
      <p className="auth-intro">
        {signup
          ? `Create your ${type} account and get started.`
          : `Sign in to your ${type} workspace.`}
      </p>
      {s.kind === "unconfigured" ? (
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
            {signup ? "Create account" : "Sign in"}
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
      ) : s.kind === "unavailable" ? (
        <div className="notice" role="alert">
          <h3>We couldn&apos;t reach your workspace.</h3>
          <p>Your account has not been changed. Please try again shortly.</p>
          <Link href={`${base}/${mode}`}>Try again</Link>
        </div>
      ) : (
        <AuthForm type={type} mode={mode} />
      )}
      <p className="auth-alternative">
        {signup ? "Already have an account?" : "New to Trybe?"}{" "}
        <Link href={`${base}/${signup ? "sign-in" : "sign-up"}`}>
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </AuthShell>
  );
}
