import { ArrowUpRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RelevancePrompt } from "@/components/feedback/relevance-prompt";
import { OrganizerWorkspaceShell } from "@/components/organizer/workspace-shell";
import { AttendeeWorkspaceShell } from "@/components/attendee/workspace-shell";
import { type AccountType, workspacePath } from "@/lib/account";

import type { EventOption } from "@/lib/events";

// WorkspaceShell is the header and frame shared by organizer and attendee workspaces.
// Attendee pages pass the memberships from GET /me/events, which renders the event
// switcher (web#9) under the header.
export function WorkspaceShell({
  type,
  events,
  activeSlug,
  organizerAccount,
  organizerEvent,
  attendeeAccount,
  children,
}: {
  type: AccountType;
  attendeeAccount?: { full_name: string };
  events?: EventOption[];
  activeSlug?: string;
  organizerAccount?: { full_name: string; organization?: string | null };
  organizerEvent?: {
    id: string;
    name?: string | null;
    status: "draft" | "published" | "ended";
  };
  children: ReactNode;
}) {
  if (type === "organizer") {
    return (
      <OrganizerWorkspaceShell
        event={organizerEvent}
        businessName={organizerAccount?.organization?.trim() || "Your business"}
        ownerName={organizerAccount?.full_name?.trim() || "Account owner"}
      >
        {children}
      </OrganizerWorkspaceShell>
    );
  }
  return (
    <AttendeeWorkspaceShell
      events={events}
      activeSlug={activeSlug}
      accountName={attendeeAccount?.full_name}
    >
      <RelevancePrompt />
      {children}
    </AttendeeWorkspaceShell>
  );
}

export function UnavailableNotice({ href }: { href: string }) {
  return (
    <section className="workspace-welcome notice" role="alert">
      <h1>Your workspace is temporarily unavailable.</h1>
      <p>
        We couldn&apos;t confirm your account. No account details have been
        changed.
      </p>
      <Link href={href}>Try again</Link>
    </section>
  );
}

export function WorkspaceUnavailable({ type }: { type: AccountType }) {
  return (
    <WorkspaceShell type={type}>
      <UnavailableNotice href={workspacePath(type)} />
    </WorkspaceShell>
  );
}

type HomeProps = {
  type: AccountType;
  firstName: string;
  card: { title: string; body: string; href?: string; cta?: string };
  privacy: { body: string; status: string };
  events?: EventOption[];
  activeSlug?: string;
};

export function WorkspaceHome({
  type,
  firstName,
  card,
  privacy,
  events,
  activeSlug,
}: HomeProps) {
  const organizer = type === "organizer";
  return (
    <WorkspaceShell type={type} events={events} activeSlug={activeSlug}>
      <section className="workspace-welcome">
        <span className="eyebrow">YOUR TRYBE STARTS HERE</span>
        <h1>
          Welcome, {firstName}
          <span className="accent-period">.</span>
        </h1>
        <p>
          {organizer
            ? "A good event brings people together. A great one gives them a reason to stay connected."
            : "Good conversations start with a little curiosity. Your next connection is ahead."}
        </p>
      </section>
      <section className="workspace-grid">
        <div className="workspace-empty">
          <div className="empty-icon">
            {organizer ? <CalendarDays size={30} /> : <Users size={30} />}
          </div>
          <span className="eyebrow">
            {organizer ? "YOUR EVENTS" : "YOUR PROFILE"}
          </span>
          <h2>{card.title}</h2>
          <p>{card.body}</p>
          {card.href ? (
            <Link href={card.href} className="progress-label">
              {card.cta} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className="progress-label">
              {card.cta} <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          )}
        </div>
        <aside className="privacy-card">
          <ShieldCheck size={26} aria-hidden="true" />
          <h2>Built around your choice.</h2>
          <p>{privacy.body}</p>
          <span>{privacy.status}</span>
        </aside>
      </section>
    </WorkspaceShell>
  );
}
