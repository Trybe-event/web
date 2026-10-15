import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/auth/theme-toggle";
import { Logo } from "@/components/ui";
import { workspacePath } from "@/lib/account";
import { getSession } from "@/lib/session";

export default async function Home() {
  const s = await getSession();
  if (s.kind === "bound") redirect(workspacePath(s.account.type));
  if (s.kind === "unbound") redirect("/account/setup");
  return (
    <main className="entry-layout">
      <header>
        <Logo />
        <ThemeToggle />
      </header>
      <div className="entry-heading">
        <span className="eyebrow">CONNECTION WITH CONVENIENCE</span>
        <h1>
          Find your people.
          <br />
          <em>Make it happen.</em>
        </h1>
        <p>
          A room full of possibilities starts with a good introduction.
          <br />
          Choose how you&apos;re joining Trybe.
        </p>
      </div>
      <div className="entry-cards">
        <Link href="/attendee/sign-in">
          <Users size={27} aria-hidden="true" />
          <span className="eyebrow">FOR ATTENDEES</span>
          <h2>Your next connection.</h2>
          <p>Bring your interests. Meet people worth knowing.</p>
          <span className="entry-link">
            Join as an attendee <ArrowUpRight size={19} aria-hidden="true" />
          </span>
        </Link>
        <Link href="/organizer/sign-in">
          <CalendarDays size={27} aria-hidden="true" />
          <span className="eyebrow">FOR ORGANIZERS</span>
          <h2>Your community, together.</h2>
          <p>Give your event a place for introductions to grow.</p>
          <span className="entry-link">
            Continue as an organizer{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </span>
        </Link>
      </div>
      <p className="account-note">
        Two separate workspaces. One clear choice. Account types cannot be
        switched.
      </p>
    </main>
  );
}
