import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui";
import type { AccountType } from "@/lib/account";
import { legalContact } from "@/lib/legal";

import { ThemeToggle } from "./theme-toggle";

// AuthShell is the two-panel layout for sign-in, sign-up and account completion:
// a story panel for the account type, and the form.
export function AuthShell({
  type,
  children,
}: {
  type: AccountType;
  children: ReactNode;
}) {
  const organizer = type === "organizer";
  return (
    <main
      className={`auth-layout ${organizer ? "for-organizer" : "for-attendee"}`}
    >
      <aside className="auth-story">
        <Image
          src={`/images/auth/${organizer ? "organizer" : "attendee"}-portrait.webp`}
          alt={
            organizer
              ? "An event host welcoming a guest into a thoughtfully prepared venue"
              : "Three event attendees enjoying a conversation in a welcoming venue"
          }
          fill
          sizes="(max-width: 720px) 1px, 48vw"
          className="auth-story-photo"
        />
        <div className="auth-story-fog" aria-hidden="true" />
        <div className="story-copy">
          <span className="eyebrow">
            {organizer ? "BRING PEOPLE TOGETHER" : "MEET WITH POSSIBILITY"}
          </span>
          <h1>
            {organizer ? (
              <>
                Make a room
                <br />
                feel like a community.
              </>
            ) : (
              <>
                Find your people.
                <br />
                Keep the conversation.
              </>
            )}
          </h1>
          <p>
            {organizer
              ? "Create your event, share its invitation, and give people a reason to connect before they arrive."
              : "Meet fellow attendees who share your interests, your work and your next big idea."}
          </p>
          <p className="story-footer">Fostering connection with convenience.</p>
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-topline">
          <Link href="/" className="mobile-brand" aria-label="Trybe home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">
          <a href={`mailto:${legalContact.email}`}>Need a hand?</a>
          <span>© {new Date().getFullYear()} Trybe</span>
        </footer>
      </section>
    </main>
  );
}
