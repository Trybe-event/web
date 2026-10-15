"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { workspacePath, type AccountType } from "@/lib/account";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authenticationDestination, signInStep } from "@/lib/auth-flow";

const schema = z.object({
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
function check(result: { error: { longMessage?: string } | null }) {
  if (result.error)
    throw new Error(
      result.error.longMessage ||
        "We couldn't complete that step. Please try again.",
    );
}

// Clerk authenticates; the existing completion route binds the account type.
export function AuthForm({
  type,
  mode,
}: {
  type: AccountType;
  mode: "sign-in" | "sign-up";
}) {
  const base = workspacePath(type);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [visible, setVisible] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const code = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });
  const recovery = useForm<{ email: string }>({
    resolver: zodResolver(schema.pick({ email: true })),
    defaultValues: { email: "" },
  });
  const newPassword = useForm<{ password: string }>({
    resolver: zodResolver(
      z.object({ password: z.string().min(8, "Use at least 8 characters.") }),
    ),
    defaultValues: { password: "" },
  });
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function finish(signingUp = false) {
    check(
      await (signingUp ? signUp : signIn).finalize({
        navigate: ({ session, decorateUrl }) => {
          router.push(
            decorateUrl(
              authenticationDestination(
                base,
                signingUp,
                Boolean(session?.currentTask),
              ),
            ),
          );
          router.refresh();
        },
      }),
    );
  }
  async function continueSignIn() {
    const next = signInStep(
      signIn.status,
      (signIn.supportedSecondFactors || []).map((factor) => factor.strategy),
    );
    if (next === "complete") {
      await finish();
      return;
    }
    setStep(next);
    if (next === "email") check(await signIn.mfa.sendEmailCode());
    if (next === "phone") check(await signIn.mfa.sendPhoneCode());
  }
  async function resend() {
    check(
      await (step === "verify-email"
        ? signUp.verifications.sendEmailCode()
        : step === "reset-code"
          ? signIn.resetPasswordEmailCode.sendCode()
          : step === "phone"
            ? signIn.mfa.sendPhoneCode()
            : signIn.mfa.sendEmailCode()),
    );
    setNotice("A new code has been sent. Check your messages.");
  }
  return (
    <div className="trybe-auth-form space-y-5">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {step === "credentials" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            run(async () => {
              if (mode === "sign-up") {
                check(
                  await signUp.password({
                    emailAddress: values.email,
                    password: values.password,
                  }),
                );
                form.resetField("password");
                if (signUp.status === "complete") {
                  await finish(true);
                  return;
                }
                if (!signUp.unverifiedFields.includes("email_address"))
                  throw new Error(
                    "Additional account information is required. Please contact support.",
                  );
                setStep("verify-email");
                check(await signUp.verifications.sendEmailCode());
              } else {
                check(
                  await signIn.password({
                    emailAddress: values.email,
                    password: values.password,
                  }),
                );
                form.resetField("password");
                await continueSignIn();
              }
            }),
          )}
        >
          <Field
            label="Email address"
            error={form.formState.errors.email?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...form.register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={busy}
              />
            )}
          </Field>
          <Field
            label="Password"
            error={form.formState.errors.password?.message}
          >
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  {...form.register("password")}
                  type={visible ? "text" : "password"}
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  className="pr-20"
                  disabled={busy}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? "Hide" : "Show"}
                </Button>
              </div>
            )}
          </Field>
          {mode === "sign-in" && (
            <Button
              variant="ghost"
              size="sm"
              className="!px-0"
              onClick={() => {
                recovery.setValue("email", form.getValues("email"));
                setError("");
                setStep("recovery");
              }}
            >
              Forgot password?
            </Button>
          )}
          <div id="clerk-captcha" />
          <Button
            type="submit"
            className="primary-button w-full"
            loading={busy}
            disabled={!isLoaded}
          >
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
          {!isLoaded && (
            <p className="text-sm text-muted" role="status">
              Connecting securely...
            </p>
          )}
        </form>
      )}
      {step === "recovery" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={recovery.handleSubmit((values) =>
            run(async () => {
              check(await signIn.create({ identifier: values.email }));
              setStep("reset-code");
              check(await signIn.resetPasswordEmailCode.sendCode());
            }),
          )}
        >
          <p className="text-sm text-muted">
            Enter your account email to receive a password reset code.
          </p>
          <Field
            label="Email address"
            error={recovery.formState.errors.email?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...recovery.register("email")}
                type="email"
                autoComplete="email"
                disabled={busy}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="primary-button w-full"
            loading={busy}
            disabled={!isLoaded}
          >
            Send reset code
          </Button>
        </form>
      )}
      {!["credentials", "recovery", "new-password"].includes(step) && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={code.handleSubmit(({ code: value }) =>
            run(async () => {
              if (step === "verify-email") {
                check(
                  await signUp.verifications.verifyEmailCode({ code: value }),
                );
                if (signUp.status !== "complete")
                  throw new Error(
                    "Additional account information is required. Please contact support.",
                  );
                await finish(true);
              } else if (step === "reset-code") {
                check(
                  await signIn.resetPasswordEmailCode.verifyCode({
                    code: value,
                  }),
                );
                code.reset();
                setStep("new-password");
              } else {
                check(
                  await (step === "totp"
                    ? signIn.mfa.verifyTOTP({ code: value })
                    : step === "phone"
                      ? signIn.mfa.verifyPhoneCode({ code: value })
                      : signIn.mfa.verifyEmailCode({ code: value })),
                );
                code.reset();
                await continueSignIn();
              }
            }),
          )}
        >
          <p className="text-sm text-muted">
            {step === "totp"
              ? "Enter the code from your authenticator app."
              : step === "phone"
                ? "Enter the verification code sent to your phone."
                : "Check your email and enter your verification code to continue."}
          </p>
          <Field
            label="Verification code"
            error={code.formState.errors.code?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...code.register("code")}
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={busy}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="primary-button w-full"
            loading={busy}
            disabled={!isLoaded}
          >
            Verify and continue
          </Button>
          {step !== "totp" && (
            <Button
              variant="ghost"
              disabled={busy || !isLoaded}
              onClick={() => run(resend)}
            >
              Resend code
            </Button>
          )}
        </form>
      )}
      {step === "new-password" && (
        <form
          className="space-y-5"
          noValidate
          onSubmit={newPassword.handleSubmit((values) =>
            run(async () => {
              check(
                await signIn.resetPasswordEmailCode.submitPassword({
                  password: values.password,
                  signOutOfOtherSessions: true,
                }),
              );
              newPassword.reset();
              await continueSignIn();
            }),
          )}
        >
          <Field
            label="New password"
            hint="Use at least 8 characters."
            error={newPassword.formState.errors.password?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...newPassword.register("password")}
                type="password"
                autoComplete="new-password"
                disabled={busy}
              />
            )}
          </Field>
          <Button
            type="submit"
            className="primary-button w-full"
            loading={busy}
            disabled={!isLoaded}
          >
            Save password and continue
          </Button>
        </form>
      )}
      {step !== "credentials" && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(async () => {
              check(
                await (mode === "sign-up" ? signUp.reset() : signIn.reset()),
              );
              form.resetField("password");
              code.reset();
              newPassword.reset();
              setStep("credentials");
            })
          }
        >
          Back to {mode === "sign-up" ? "sign up" : "sign in"}
        </Button>
      )}
    </div>
  );
}
