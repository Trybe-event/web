import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Attendee sign up" };

export default function Page() {
  return <AuthPage type="attendee" mode="sign-up" />;
}
