"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
import { workspacePath, type AccountType } from "@/lib/account";
export function AuthForm({ type, mode }: { type: AccountType; mode: "sign-in" | "sign-up" }) {
 const base = workspacePath(type);
 const appearance = {
  variables: { colorPrimary: "#33472c", colorText: "#20261d", colorBackground: "#ffffff", borderRadius: "0.85rem", fontFamily: '"DM Sans", sans-serif' },
  elements: { rootBox: "trybe-clerk-root", cardBox: "trybe-clerk-box", card: "trybe-clerk-card", footer: "trybe-clerk-footer" },
 };
 return mode === "sign-in"
  ? <SignIn routing="path" path={`${base}/sign-in`} signUpUrl={`${base}/sign-up`} forceRedirectUrl={base} appearance={appearance}/>
  : <SignUp routing="path" path={`${base}/sign-up`} signInUrl={`${base}/sign-in`} forceRedirectUrl={`${base}/complete`} appearance={appearance}/>;
}
