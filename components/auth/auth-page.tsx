import Link from "next/link";
import { redirect } from "next/navigation";

import { workspacePath, type AccountType } from "@/lib/account";
import { routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";

import { AuthForm } from "./auth-form";
import { AuthShell } from "./auth-shell";
import { TermsConsent } from "@/components/legal/legal-notice";

// An attendee arriving from an event keeps that event through sign-in and sign-up
// (web#7, web#8): the slug travels in the query and Clerk's redirect carries it on.
export async function AuthPage({
  type,
  mode,
  eventSlug,
}: {
  type: AccountType;
  mode: "sign-in" | "sign-up";
  eventSlug?: string;
}) {
  const sessionState = await getSession();
  if (sessionState.kind === "bound")
    redirect(
      eventSlug && sessionState.account.type === "attendee"
        ? routes.eventLanding(eventSlug)
        : workspacePath(sessionState.account.type),
    );
  // The person already chose attendee or organizer by opening this page, so a new
  // sign-in goes straight to that type's completion step, never back to the chooser.
  if (sessionState.kind === "unbound")
    redirect(withEventParam(`${workspacePath(type)}/complete`, eventSlug));
  const isSignUp = mode === "sign-up";
  const isBusinessSignup = isSignUp && type === "organizer";
  const workspaceRoute = workspacePath(type);
  const introduction = (
    <>
      <span className="eyebrow">
        {type === "organizer" ? "ORGANIZER" : "ATTENDEE"} ACCOUNT
      </span>
      <h2>
        {isBusinessSignup
          ? "Tell us about your business"
          : isSignUp
            ? "Make room for possibility."
            : "Good to see you again."}
      </h2>
      <p className="auth-intro">
        {isBusinessSignup
          ? "Use the registered business details associated with your business."
          : isSignUp
            ? `Create your ${type} account and get started.`
            : `Sign in to your ${type} workspace.`}
      </p>
    </>
  );
  return (
    <AuthShell type={type}>
      {sessionState.kind !== "signed-out" && introduction}
      {sessionState.kind === "unconfigured" ? (
        <div className="auth-unavailable">
          {isBusinessSignup &&
            [
              "Registered business name",
              "Contact first name",
              "Contact last name",
              "Phone number",
            ].map((label) => (
              <div key={label}>
                <label htmlFor={`preview-${label.replaceAll(" ", "-")}`}>
                  {label}
                </label>
                <input id={`preview-${label.replaceAll(" ", "-")}`} disabled />
              </div>
            ))}
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
          {isSignUp && <TermsConsent checked={false} />}
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
          <Link href={withEventParam(`${workspaceRoute}/${mode}`, eventSlug)}>
            Try again
          </Link>
        </div>
      ) : (
        <AuthForm
          type={type}
          mode={mode}
          eventSlug={eventSlug}
          introduction={introduction}
        />
      )}
      <p className="auth-alternative">
        {isSignUp ? "Already have an account?" : "New to Trybe?"}{" "}
        <Link
          href={withEventParam(
            `${workspaceRoute}/${isSignUp ? "sign-in" : "sign-up"}`,
            eventSlug,
          )}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </AuthShell>
  );
}
