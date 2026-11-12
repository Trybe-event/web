import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Manrope } from "next/font/google";

import { DevelopmentApiMockProvider } from "@/components/development-api-mock-provider";
import { authConfigured } from "@/lib/auth-config";
import { parseThemePreference } from "@/lib/theme";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://trybe-event.vercel.app",
  ),
  title: { default: "Trybe", template: "%s · Trybe" },
  description: "Meet the right people at your next event.",
  openGraph: {
    type: "website",
    siteName: "Trybe",
    title: "Trybe | Your people. Your next chapter.",
    description:
      "Discover events, meet your people and keep the conversation going. Fostering connection with convenience.",
    url: "/",
    images: [
      {
        url: "/images/trybe-share-v1.png",
        width: 1200,
        height: 630,
        alt: "Trybe. Your people. Your next chapter.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trybe | Your people. Your next chapter.",
    description: "Fostering connection with convenience.",
    images: ["/images/trybe-share-v1.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A saved choice wins; otherwise the theme follows the system (see globals.css).
  const saved = (await cookies()).get("trybe_theme")?.value;
  const theme = parseThemePreference(saved);
  const page = (
    <html
      lang="en"
      data-theme={theme}
      className={`${dmSans.variable} ${manrope.variable}`}
    >
      <body className="antialiased">
        <DevelopmentApiMockProvider>{children}</DevelopmentApiMockProvider>
      </body>
    </html>
  );
  return authConfigured() ? (
    <ClerkProvider
      prefetchUI={false}
      proxyUrl={process.env.NODE_ENV === "development" ? "/__clerk" : undefined}
    >
      {page}
    </ClerkProvider>
  ) : (
    page
  );
}
