import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Manrope } from "next/font/google";

import { MockProvider } from "@/components/mock-provider";
import { authConfigured } from "@/lib/auth-config";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Trybe", template: "%s · Trybe" },
  description: "Meet the right people at your next event.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A saved choice wins; otherwise the theme follows the system (see globals.css).
  const saved = (await cookies()).get("trybe_theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : undefined;
  const page = (
    <html
      lang="en"
      data-theme={theme}
      className={`${dmSans.variable} ${manrope.variable}`}
    >
      <body className="antialiased">
        <MockProvider>{children}</MockProvider>
      </body>
    </html>
  );
  return authConfigured() ? <ClerkProvider>{page}</ClerkProvider> : page;
}
