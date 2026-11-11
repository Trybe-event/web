"use client";

import {
  Bell,
  CalendarDays,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UsersRound,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/ui";
import { BrandMark } from "@/components/brand-mark";
import { SignOut } from "@/components/auth/sign-out";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { EventSwitcher } from "@/components/auth/event-switcher";
import { InboxBadge } from "@/components/messaging/inbox-badge";
import { attendeeSection, attendeeSections } from "@/lib/attendee-navigation";
import type { EventOption } from "@/lib/events";

const icons = {
  discover: Compass,
  events: CalendarDays,
  network: UsersRound,
  profile: UserRound,
};

export function AttendeeWorkspaceShell({
  children,
  events,
  activeSlug,
  accountName,
}: {
  children: ReactNode;
  events?: EventOption[];
  activeSlug?: string;
  accountName?: string;
}) {
  const pathname = usePathname();
  const section = attendeeSection(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const activeEvent = events?.find((event) => event.slug === activeSlug);
  const sectionTitle = attendeeSections.find(
    (item) => item.id === section,
  )?.label;
  const initial = accountName?.trim().charAt(0).toUpperCase();
  function links(mobile: boolean) {
    return attendeeSections.map((item) => {
      const Icon = icons[item.id];
      return (
        <Link
          key={item.id}
          href={item.href}
          className="attendee-nav-link"
          aria-current={section === item.id ? "page" : undefined}
          title={item.label}
        >
          <Icon size={mobile ? 20 : 18} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      );
    });
  }
  return (
    <div className="attendee-app" data-sidebar-collapsed={collapsed}>
      <a className="organizer-skip-link" href="#attendee-content">
        Skip to content
      </a>
      <aside className="attendee-sidebar" aria-label="Attendee workspace">
        <div className="attendee-sidebar-brand">
          <Link href="/attendee" aria-label="Trybe attendee home">
            {collapsed ? <BrandMark /> : <Logo />}
          </Link>
          <button
            type="button"
            className="organizer-icon-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
        <nav
          aria-label="Attendee navigation"
          className="attendee-desktop-navigation"
        >
          {links(false)}
        </nav>
        {!collapsed && events && events.length > 0 && (
          <div className="attendee-sidebar-events">
            <p>Your gatherings</p>
            {events.slice(0, 5).map((event) => (
              <Link
                key={event.slug}
                href={`/events/${encodeURIComponent(event.slug)}`}
                aria-current={activeSlug === event.slug ? "page" : undefined}
              >
                <span aria-hidden="true">
                  {event.name.charAt(0).toUpperCase()}
                </span>
                <span>{event.name}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="attendee-sidebar-footer">
          <Link
            href="/attendee/profile/settings"
            className="attendee-privacy-link"
            title="Privacy & visibility"
          >
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Privacy &amp; visibility</span>
          </Link>
          <div className="attendee-identity">
            <Link href="/attendee/profile" aria-label="Your profile">
              <span className="attendee-identity-avatar" aria-hidden="true">
                {initial || <UserRound size={16} />}
              </span>
              <span className="attendee-identity-name">
                {accountName || "Your Trybe"}
                <small>Attendee workspace</small>
              </span>
            </Link>
            <SignOut iconOnly />
          </div>
        </div>
      </aside>
      <div className="attendee-main">
        <header className="attendee-topbar">
          <Link
            href="/attendee"
            className="attendee-mobile-brand"
            aria-label="Trybe attendee home"
          >
            <Logo />
          </Link>
          <div className="attendee-breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{activeEvent?.name || sectionTitle}</strong>
          </div>
          <div className="attendee-header-actions">
            <div className="attendee-inbox-shortcut">
              <InboxBadge />
            </div>
            <Link
              href="/attendee/notifications"
              className="attendee-icon-link"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main id="attendee-content" className="attendee-content" tabIndex={-1}>
          {activeSlug && events && events.length > 0 && (
            <EventSwitcher events={events} activeSlug={activeSlug} />
          )}
          {children}
        </main>
      </div>
      <nav
        className="attendee-mobile-navigation"
        aria-label="Attendee navigation"
      >
        {links(true)}
      </nav>
    </div>
  );
}
