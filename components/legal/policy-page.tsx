import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/auth/theme-toggle";
import { Logo } from "@/components/ui";
import { legalContact } from "@/lib/legal";

export type PolicySection = { id: string; title: string; content: ReactNode };

export function PolicyPage({
  title,
  introduction,
  sections,
}: {
  title: string;
  introduction: string;
  sections: PolicySection[];
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Trybe home">
            <Logo />
          </Link>
          <nav
            aria-label="Legal pages"
            className="flex items-center gap-4 text-sm font-medium"
          >
            <Link
              href="/terms"
              aria-current={title === "Terms of Service" ? "page" : undefined}
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              aria-current={title === "Privacy Policy" ? "page" : undefined}
            >
              Privacy
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="w-full px-5 py-12 sm:px-8 sm:py-16">
        <div className="policy-document mx-auto w-full max-w-4xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Trust at Trybe
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="policy-prose mt-4 text-sm leading-7 text-muted">
              {introduction}
            </p>
            <p className="mt-4 text-sm text-muted">
              Proposed policy · Updated {legalContact.updated}
            </p>
          </div>
          <details className="mb-10 rounded-xl border border-line bg-surface px-5 py-4">
            <summary className="cursor-pointer text-sm font-semibold">
              On this page
            </summary>
            <nav aria-label="On this page" className="mt-4">
              <ol className="grid gap-x-8 gap-y-2 text-sm leading-6 text-muted sm:grid-cols-2">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="hover:text-ink hover:underline"
                    >
                      {index + 1}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
          <article className="min-w-0 w-full space-y-9">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="scroll-mt-24 border-b border-line pb-8 last:border-b-0"
              >
                <h2
                  id={`${section.id}-heading`}
                  className="mb-3 text-lg font-semibold tracking-tight"
                >
                  {index + 1}. {section.title}
                </h2>
                <div className="policy-prose space-y-3 text-sm leading-7 text-muted [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <footer className="border-t border-line px-5 py-7 text-center text-sm text-muted">
        <p>
          Questions?{" "}
          <a
            className="break-all underline underline-offset-4"
            href={`mailto:${legalContact.email}`}
          >
            {legalContact.email}
          </a>
        </p>
        <p className="mt-2">Connection with convenience.</p>
      </footer>
    </div>
  );
}
