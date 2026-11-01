"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { workspacePath, type AccountType } from "@/lib/account";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authenticationDestination, signInStep } from "@/lib/auth-flow";
import { newPasswordSchema } from "@/lib/password-policy";
import {
  assertAuthenticationSucceeded,
  AuthenticationActionError,
  authenticationErrorDetail,
} from "@/lib/authentication-errors";
import { PasswordChecklist } from "./password-checklist";

const signInCredentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
const codeSchema = z.object({
  code: z.string().trim().min(1, "Enter your verification code."),
});
type Step =
  | "credentials"
  | "recovery"
  | "reset-code"
  | "new-password"
  | "verify-email"
  | "email"
  | "phone"
  | "totp";
// Clerk authenticates; the existing completion route binds the account type.
// An event in the query (web#7, web#8) is carried into the destination, so an
// attendee signing in from an event page returns to that event.
export function AuthForm({
  type,
  mode,
  eventSlug,
}: {
  type: AccountType;
  mode: "sign-in" | "sign-up";
  eventSlug?: string;
}) {
  const workspaceRoute = workspacePath(type);
  const credentialsSchema =
    mode === "sign-up"
      ? signInCredentialsSchema.extend({ password: newPasswordSchema })
      : signInCredentialsSchema;
  const passwordChecklistId = useId();
  const newPasswordChecklistId = useId();
  const { signIn, errors: signInErrors } = useSignIn();
  const { signUp, errors: signUpErrors } = useSignUp();
  const { isLoaded } = useAuth();
  const [authenticationLoadTimedOut, setAuthenticationLoadTimedOut] =
    useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timer = window.setTimeout(
      () => setAuthenticationLoadTimedOut(true),
      20000,
    );
    return () => window.clearTimeout(timer);
  }, [isLoaded]);
  const [authenticationStep, setAuthenticationStep] =
    useState<Step>("credentials");
  const [isAuthenticationPending, setAuthenticationPending] = useState(false);
  const [authenticationError, setAuthenticationError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });
  const verificationForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });
  const passwordRecoveryForm = useForm<{ email: string }>({
    resolver: zodResolver(credentialsSchema.pick({ email: true })),
    defaultValues: { email: "" },
  });
  const newPasswordForm = useForm<{ password: string }>({
    resolver: zodResolver(z.object({ password: newPasswordSchema })),
    defaultValues: { password: "" },
  });
  const signupPassword = useWatch({
    control: credentialsForm.control,
    name: "password",
  });
  const resetPassword = useWatch({
    control: newPasswordForm.control,
    name: "password",
  });
  async function performAuthenticationAction(action: () => Promise<void>) {
    setAuthenticationPending(true);
    setAuthenticationError("");
    setVerificationNotice("");
    try {
      await action();
    } catch (caught) {
      const detail =
        caught instanceof AuthenticationActionError
          ? caught.detail
          : authenticationErrorDetail(caught);
      setAuthenticationError(
        caught instanceof Error && !("clerkError" in caught)
          ? caught.message
          : detail.message,
      );
      if (process.env.NODE_ENV === "development" && detail.code)
        console.warn("Authentication rejected:", detail.code);
    } finally {
      setAuthenticationPending(false);
    }
  }
  async function activateAuthenticatedSession(signingUp = false) {
    assertAuthenticationSucceeded(
      await (signingUp ? signUp : signIn).finalize({
        navigate: ({ session, decorateUrl }) => {
          window.location.assign(
            decorateUrl(
              authenticationDestination(
                workspaceRoute,
                signingUp,
                Boolean(session?.currentTask),
                eventSlug,
              ),
            ),
          );
        },
      }),
    );
  }
  async function continueSignIn() {
    const nextAuthenticationStep = signInStep(
      signIn.status,
      (signIn.supportedSecondFactors || []).map((factor) => factor.strategy),
    );
    if (nextAuthenticationStep === "complete") {
      await activateAuthenticatedSession();
      return;
    }
    setAuthenticationStep(nextAuthenticationStep);
    if (nextAuthenticationStep === "email")
      assertAuthenticationSucceeded(await signIn.mfa.sendEmailCode());
    if (nextAuthenticationStep === "phone")
      assertAuthenticationSucceeded(await signIn.mfa.sendPhoneCode());
  }
  async function resendVerificationCode() {
    assertAuthenticationSucceeded(
      await (authenticationStep === "verify-email"
        ? signUp.verifications.sendEmailCode()
        : authenticationStep === "reset-code"
          ? signIn.resetPasswordEmailCode.sendCode()
          : authenticationStep === "phone"
            ? signIn.mfa.sendPhoneCode()
            : signIn.mfa.sendEmailCode()),
    );
    setVerificationNotice("A new code has been sent. Check your messages.");
  }
  return (
    <div className="trybe-auth-form space-y-5">
      {authenticationError && <Alert>{authenticationError}</Alert>}
      {verificationNotice && <Alert tone="success">{verificationNotice}</Alert>}
      {authenticationStep === "credentials" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={credentialsForm.handleSubmit((values) =>
            performAuthenticationAction(async () => {
              if (mode === "sign-up") {
                assertAuthenticationSucceeded(
                  await signUp.password({
                    emailAddress: values.email,
                    password: values.password,
                  }),
                );
                credentialsForm.resetField("password");
                if (signUp.status === "complete") {
                  await activateAuthenticatedSession(true);
                  return;
                }
                if (!signUp.unverifiedFields.includes("email_address"))
                  throw new Error(
                    "Additional account information is required. Please contact support.",
                  );
                setAuthenticationStep("verify-email");
                assertAuthenticationSucceeded(
                  await signUp.verifications.sendEmailCode(),
                );
              } else {
                assertAuthenticationSucceeded(
                  await signIn.password({
                    emailAddress: values.email,
                    password: values.password,
                  }),
                );
                credentialsForm.resetField("password");
                await continueSignIn();
              }
            }),
          )}
        >
          <Field
            label="Email address"
            error={
              credentialsForm.formState.errors.email?.message ||
              (mode === "sign-up"
                ? signUpErrors.fields.emailAddress
                : signInErrors.fields.identifier
              )?.longMessage ||
              (mode === "sign-up"
                ? signUpErrors.fields.emailAddress
                : signInErrors.fields.identifier
              )?.message
            }
          >
            {(props) => (
              <Input
                {...props}
                {...credentialsForm.register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isAuthenticationPending}
              />
            )}
          </Field>
          <Field
            label="Password"
            error={
              credentialsForm.formState.errors.password?.message ||
              (mode === "sign-up"
                ? signUpErrors.fields.password
                : signInErrors.fields.password
              )?.longMessage ||
              (mode === "sign-up"
                ? signUpErrors.fields.password
                : signInErrors.fields.password
              )?.message
            }
          >
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  {...credentialsForm.register("password")}
                  aria-describedby={
                    [
                      props["aria-describedby"],
                      mode === "sign-up" ? passwordChecklistId : undefined,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  className="pr-20"
                  disabled={isAuthenticationPending}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1"
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={isPasswordVisible}
                  onClick={() => setPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? "Hide" : "Show"}
                </Button>
              </div>
            )}
          </Field>
          {mode === "sign-up" && (
            <PasswordChecklist
              id={passwordChecklistId}
              password={signupPassword}
            />
          )}
          {mode === "sign-in" && (
            <Button
              variant="ghost"
              size="sm"
              className="!px-0"
              onClick={() => {
                passwordRecoveryForm.setValue(
                  "email",
                  credentialsForm.getValues("email"),
                );
                setAuthenticationError("");
                setAuthenticationStep("recovery");
              }}
            >
              Forgot password?
            </Button>
          )}
          <div id="clerk-captcha" />
          <Button
            type="submit"
            className="primary-button w-full"
            loading={isAuthenticationPending}
            disabled={!isLoaded}
          >
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
          {!isLoaded && authenticationLoadTimedOut ? (
            <Alert>
              Sign-in could not connect. Your details have not been submitted.
              Check your connection, then reload this page.
              <Button
                type="button"
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                Reload sign-in
              </Button>
            </Alert>
          ) : (
            !isLoaded && (
              <p className="text-sm text-muted" role="status">
                Connecting securely...
              </p>
            )
          )}
        </form>
      )}
      {authenticationStep === "recovery" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={passwordRecoveryForm.handleSubmit((values) =>
            performAuthenticationAction(async () => {
              assertAuthenticationSucceeded(
                await signIn.create({ identifier: values.email }),
              );
              setAuthenticationStep("reset-code");
              assertAuthenticationSucceeded(
                await signIn.resetPasswordEmailCode.sendCode(),
              );
            }),
          )}
        >
          <p className="text-sm text-muted">
            Enter your account email to receive a password reset code.
          </p>
          <Field
            label="Email address"
            error={
              passwordRecoveryForm.formState.errors.email?.message ||
              signInErrors.fields.identifier?.longMessage ||
              signInErrors.fields.identifier?.message
            }
          >
            {(props) => (
              <Input
                {...props}
                {...passwordRecoveryForm.register("email")}
                type="email"
                autoComplete="email"
                disabled={isAuthenticationPending}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="primary-button w-full"
            loading={isAuthenticationPending}
            disabled={!isLoaded}
          >
            Send reset code
          </Button>
        </form>
      )}
      {!["credentials", "recovery", "new-password"].includes(
        authenticationStep,
      ) && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={verificationForm.handleSubmit(({ code: value }) =>
            performAuthenticationAction(async () => {
              if (authenticationStep === "verify-email") {
                assertAuthenticationSucceeded(
                  await signUp.verifications.verifyEmailCode({ code: value }),
                );
                if (signUp.status !== "complete")
                  throw new Error(
                    "Additional account information is required. Please contact support.",
                  );
                await activateAuthenticatedSession(true);
              } else if (authenticationStep === "reset-code") {
                assertAuthenticationSucceeded(
                  await signIn.resetPasswordEmailCode.verifyCode({
                    code: value,
                  }),
                );
                verificationForm.reset();
                setAuthenticationStep("new-password");
              } else {
                assertAuthenticationSucceeded(
                  await (authenticationStep === "totp"
                    ? signIn.mfa.verifyTOTP({ code: value })
                    : authenticationStep === "phone"
                      ? signIn.mfa.verifyPhoneCode({ code: value })
                      : signIn.mfa.verifyEmailCode({ code: value })),
                );
                verificationForm.reset();
                await continueSignIn();
              }
            }),
          )}
        >
          <p className="text-sm text-muted">
            {authenticationStep === "totp"
              ? "Enter the code from your authenticator app."
              : authenticationStep === "phone"
                ? "Enter the verification code sent to your phone."
                : "Check your email and enter your verification code to continue."}
          </p>
          <Field
            label="Verification code"
            error={
              verificationForm.formState.errors.code?.message ||
              (mode === "sign-up"
                ? signUpErrors.fields.code
                : signInErrors.fields.code
              )?.longMessage ||
              (mode === "sign-up"
                ? signUpErrors.fields.code
                : signInErrors.fields.code
              )?.message
            }
          >
            {(props) => (
              <Input
                {...props}
                {...verificationForm.register("code")}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={isAuthenticationPending}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="primary-button w-full"
            loading={isAuthenticationPending}
            disabled={!isLoaded}
          >
            Verify and continue
          </Button>
          {authenticationStep !== "totp" && (
            <Button
              variant="ghost"
              disabled={isAuthenticationPending || !isLoaded}
              onClick={() =>
                performAuthenticationAction(resendVerificationCode)
              }
            >
              Resend code
            </Button>
          )}
        </form>
      )}
      {authenticationStep === "new-password" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={newPasswordForm.handleSubmit((values) =>
            performAuthenticationAction(async () => {
              assertAuthenticationSucceeded(
                await signIn.resetPasswordEmailCode.submitPassword({
                  password: values.password,
                  signOutOfOtherSessions: true,
                }),
              );
              newPasswordForm.reset();
              await continueSignIn();
            }),
          )}
        >
          <Field
            label="New password"
            error={
              newPasswordForm.formState.errors.password?.message ||
              signInErrors.fields.password?.longMessage ||
              signInErrors.fields.password?.message
            }
          >
            {(props) => (
              <Input
                {...props}
                {...newPasswordForm.register("password")}
                aria-describedby={[
                  props["aria-describedby"],
                  newPasswordChecklistId,
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="password"
                autoComplete="new-password"
                disabled={isAuthenticationPending}
              />
            )}
          </Field>
          <PasswordChecklist
            id={newPasswordChecklistId}
            password={resetPassword}
          />
          <Button
            type="submit"
            className="primary-button w-full"
            loading={isAuthenticationPending}
            disabled={!isLoaded}
          >
            Save password and continue
          </Button>
        </form>
      )}
      {authenticationStep !== "credentials" && (
        <Button
          variant="ghost"
          disabled={isAuthenticationPending}
          onClick={() =>
            performAuthenticationAction(async () => {
              assertAuthenticationSucceeded(
                await (mode === "sign-up" ? signUp.reset() : signIn.reset()),
              );
              credentialsForm.resetField("password");
              verificationForm.reset();
              newPasswordForm.reset();
              setAuthenticationStep("credentials");
            })
          }
        >
          Back to {mode === "sign-up" ? "sign up" : "sign in"}
        </Button>
      )}
    </div>
  );
}
