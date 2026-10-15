import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Organizer sign in" };

export default function Page() {
  return <AuthPage type="organizer" mode="sign-in" />;
}
