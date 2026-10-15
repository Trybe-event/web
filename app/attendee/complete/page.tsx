import type { Metadata } from "next";

import { CompletePage } from "@/components/auth/complete-page";

export const metadata: Metadata = { title: "Finish your account" };

export default function Page() {
  return <CompletePage type="attendee" />;
}
