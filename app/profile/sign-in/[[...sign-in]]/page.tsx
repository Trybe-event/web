import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Attendee sign in" };

export default function AttendeeSignIn() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-4 py-10">
      <Logo />
      <SignIn
        path="/profile/sign-in"
        signUpUrl="/profile/sign-up"
        forceRedirectUrl="/profile"
      />
    </main>
  );
}
