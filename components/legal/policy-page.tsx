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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
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
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Trust at Trybe
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">{introduction}</p>
          <p className="mt-4 text-sm text-muted">
            Proposed policy · Updated {legalContact.updated}
          </p>
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav
            aria-label="On this page"
            className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24"
          >
            <p className="mb-3 text-sm font-semibold">On this page</p>
            <ol className="grid gap-2 text-sm leading-6 text-muted">
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
          <article className="min-w-0 max-w-2xl space-y-9">
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
                <div className="space-y-3 text-base leading-7 text-muted [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
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
