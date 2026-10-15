import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";

import { MockProvider } from "@/components/mock-provider";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
        <body className="antialiased">
          <MockProvider>{children}</MockProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
