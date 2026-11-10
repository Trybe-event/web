import Link from "next/link";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { ButtonLink, Logo } from "@/components/ui";
import { legalContact } from "@/lib/legal";

export const metadata: Metadata = {
  title: "404 page",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="not-found-page">
      <header className="not-found-header">
        <Link href="/" aria-label="Trybe home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="not-found-content">
        <div className="not-found-number" aria-hidden="true">
          <span>4</span>
          <span className="not-found-mark">
            <BrandMark />
          </span>
          <span>4</span>
        </div>
        <p className="eyebrow">PAGE NOT FOUND</p>
        <h1>This connection leads somewhere else.</h1>
        <p>
          The page may have moved, or the link may be incomplete. Let’s get you
          back to your people.
        </p>
        <ButtonLink href="/" className="rounded-full">
          Back to Trybe
        </ButtonLink>
        <a className="not-found-support" href={`mailto:${legalContact.email}`}>
          Need a hand? Contact Trybe
        </a>
      </main>
      <footer className="not-found-footer">
        <span>Fostering connection with convenience.</span>
        <nav aria-label="Legal pages">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
