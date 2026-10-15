import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth-config";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Trybe",
    template: "%s | Trybe",
  },
  description:
    "Connection with convenience. Discover relevant people at an event, connect by mutual consent, and keep in touch.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = (await cookies()).get("trybe_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme}>
      <body>{authConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children}</body>
    </html>
  );
}
