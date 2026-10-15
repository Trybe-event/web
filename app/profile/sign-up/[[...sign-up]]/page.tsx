import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Create your attendee account" };

export default function AttendeeSignUp() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10">
      <Logo />
      <p className="text-center text-muted">
        This creates an attendee account. Organizers sign up separately at{" "}
        <span className="font-semibold">/organizer</span>.
      </p>
      <SignUp
        path="/profile/sign-up"
        signInUrl="/profile/sign-in"
        forceRedirectUrl="/profile/setup"
      />
    </main>
  );
}
