import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WrongAccount } from "@/components/wrong-account";
import { routes } from "@/lib/routes";
import { getSession } from "@/lib/session";

import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your attendee account" };

export default async function Setup() {
  const s = await getSession();
  if (s.kind === "signed-out") redirect(routes.attendeeSignIn);
  if (s.kind === "bound") {
    if (s.account.type !== "attendee")
      return <WrongAccount actual={s.account.type} expected="attendee" />;
    redirect(routes.attendeeProfile);
  }
  const user = await currentUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-bold">Welcome to Trybe</h1>
      <p className="mt-2 text-muted">
        Confirm your name to finish creating your attendee account.
      </p>
      <SetupForm defaultName={name} />
    </main>
  );
}
