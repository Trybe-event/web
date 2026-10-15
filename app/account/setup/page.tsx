import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOut } from "@/components/auth/sign-out";
import { Logo } from "@/components/ui";
import { workspacePath } from "@/lib/account";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Choose your account" };

// Signed in with Clerk but no Trybe account type yet: choose one, explicitly.
export default async function AccountSetup() {
  const s = await getSession();
  if (s.kind === "bound") redirect(workspacePath(s.account.type));
  if (s.kind === "signed-out" || s.kind === "unconfigured") redirect("/");
  const choosing = s.kind === "unbound";
  return (
    <main className="entry-layout">
      <header>
        <Logo />
        <SignOut />
      </header>
      <div className="entry-heading">
        <span className="eyebrow">FINISH YOUR INTRODUCTION</span>
        <h1>
          {choosing
            ? "How are you joining Trybe?"
            : "We couldn't reach your account."}
        </h1>
        <p>
          {choosing
            ? "You're signed in. Choose and confirm one permanent account type."
            : "Please try again shortly. No account type has been assigned."}
        </p>
      </div>
      {choosing && (
        <div className="entry-cards">
          <Link href="/attendee/complete">
            <h2>As an attendee</h2>
            <p>Join events and meet your people.</p>
          </Link>
          <Link href="/organizer/complete">
            <h2>As an organizer</h2>
            <p>Create events and bring people together.</p>
          </Link>
        </div>
      )}
    </main>
  );
}
