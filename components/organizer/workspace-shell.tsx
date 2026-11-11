"use client";

import {
  CalendarDays,
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquare,
  Eye,
  CreditCard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button, Dialog, Logo } from "@/components/ui";
import { BrandMark } from "@/components/brand-mark";
import { SignOut } from "@/components/auth/sign-out";
import { ThemeToggle } from "@/components/auth/theme-toggle";

export function OrganizerWorkspaceShell({
  businessName,
  ownerName,
  event,
  children,
}: {
  businessName: string;
  ownerName: string;
  event?: {
    id: string;
    name?: string | null;
    status: "draft" | "published" | "ended";
  };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const creatingExperience = pathname === "/organizer/experiences/new";
  const creatingEvent = pathname === "/organizer/events/new";
  const managingEvent =
    pathname.startsWith("/organizer/events/") && !creatingEvent;
  const eventRoot = event
    ? `/organizer/events/${encodeURIComponent(event.id)}`
    : "";
  const eventSections = [
    { label: "Overview", href: eventRoot, icon: LayoutDashboard },
    { label: "Event setup", href: `${eventRoot}/edit`, icon: ListChecks },
    { label: "Attendance", href: `${eventRoot}/attendance`, icon: Users },
    { label: "Reach", href: `${eventRoot}/share`, icon: Megaphone },
    {
      label: "Updates & Q&A",
      href: `${eventRoot}/engagement`,
      icon: MessageSquare,
    },
    { label: "Analytics", href: `${eventRoot}/analytics`, icon: BarChart3 },
    { label: "Preview event", href: `${eventRoot}/preview`, icon: Eye },
    { label: "Event settings", href: `${eventRoot}/settings`, icon: Settings },
  ];
  const pageTitle = event
    ? eventSections.find((section) => section.href === pathname)?.label ||
      "Event setup"
    : creatingExperience
      ? "Create experience"
      : creatingEvent
        ? "Create event"
        : managingEvent
          ? "Manage event"
          : pathname === "/organizer/audience"
            ? "Audience"
            : pathname === "/organizer/payments"
              ? "Payments"
              : pathname === "/organizer/settings"
                ? "Settings"
                : "My events";
  const workspaceName = event
    ? event.name?.trim() || "Untitled event"
    : businessName;
  const ownerInitials = ownerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="organizer-workspace"
      data-sidebar-collapsed={sidebarCollapsed}
      data-mobile-navigation-open={mobileNavigationOpen}
    >
      <a className="organizer-skip-link" href="#organizer-content">
        Skip to workspace
      </a>
      <aside className="organizer-sidebar" aria-label="Organizer workspace">
        <div className="organizer-sidebar-top">
          <Link
            href="/organizer"
            aria-label="Trybe organizer home"
            className="organizer-brand"
          >
            {sidebarCollapsed ? <BrandMark /> : <Logo />}
          </Link>
          <button
            type="button"
            className="organizer-icon-button organizer-desktop-toggle"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="organizer-navigation"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <button
            type="button"
            className="organizer-icon-button organizer-mobile-toggle"
            aria-label={
              mobileNavigationOpen ? "Close navigation" : "Open navigation"
            }
            aria-expanded={mobileNavigationOpen}
            aria-controls="organizer-navigation"
            onClick={() => setMobileNavigationOpen(!mobileNavigationOpen)}
          >
            {mobileNavigationOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className="organizer-business" title={workspaceName}>
          <span className="organizer-business-monogram" aria-hidden="true">
            {workspaceName.charAt(0).toUpperCase()}
          </span>
          <div className="organizer-sidebar-label">
            <strong>{workspaceName}</strong>
            <span>
              {event
                ? `${event.status.charAt(0).toUpperCase()}${event.status.slice(1)} event`
                : "Organizer workspace"}
            </span>
          </div>
        </div>
        <nav
          id="organizer-navigation"
          className="organizer-navigation"
          aria-label="Organizer sections"
        >
          {event ? (
            <>
              <Link
                href="/organizer"
                className="organizer-nav-item organizer-back-link"
                aria-label="All events"
                title="All events"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span className="organizer-sidebar-label">All events</span>
              </Link>
              {eventSections.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="organizer-nav-item"
                  aria-label={label}
                  title={label}
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={() => setMobileNavigationOpen(false)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="organizer-sidebar-label">{label}</span>
                </Link>
              ))}
            </>
          ) : (
            <>
              <span className="organizer-nav-heading organizer-sidebar-label">
                WORKSPACE
              </span>
              <Link
                href="/organizer"
                className="organizer-nav-item"
                aria-label="My events"
                aria-current={pathname === "/organizer" ? "page" : undefined}
                title="My events"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <CalendarDays size={18} aria-hidden="true" />
                <span className="organizer-sidebar-label">My events</span>
              </Link>
              <Link
                href="/organizer/audience"
                className="organizer-nav-item"
                aria-label="Audience"
                aria-current={
                  pathname === "/organizer/audience" ? "page" : undefined
                }
                title="Audience"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <Users size={18} aria-hidden="true" />
                <span className="organizer-sidebar-label">Audience</span>
              </Link>
              <Link
                href="/organizer/payments"
                className="organizer-nav-item"
                title="Payments"
                aria-label="Payments"
                aria-current={
                  pathname === "/organizer/payments" ? "page" : undefined
                }
                onClick={() => setMobileNavigationOpen(false)}
              >
                <CreditCard size={18} aria-hidden="true" />
                <span className="organizer-sidebar-label">Payments</span>
              </Link>
              <Link
                href="/organizer/settings"
                className="organizer-nav-item"
                title="Settings"
                aria-label="Settings"
                aria-current={
                  pathname === "/organizer/settings" ? "page" : undefined
                }
                onClick={() => setMobileNavigationOpen(false)}
              >
                <Settings size={18} aria-hidden="true" />
                <span className="organizer-sidebar-label">Settings</span>
              </Link>
            </>
          )}
        </nav>
        <div className="organizer-sidebar-bottom">
          <div className="organizer-owner" title={ownerName}>
            <span className="organizer-owner-avatar" aria-hidden="true">
              {ownerInitials}
            </span>
            <div className="organizer-sidebar-label">
              <strong>{ownerName}</strong>
              <span>Business owner</span>
            </div>
            <div className="organizer-sign-out">
              <SignOut iconOnly />
            </div>
          </div>
        </div>
      </aside>
      <div className="organizer-main">
        <header className="organizer-topbar">
          <div>
            <Link href="/organizer" className="organizer-breadcrumb">
              My events
            </Link>
            <span className="organizer-topbar-divider" aria-hidden="true">
              /
            </span>
            <span className="organizer-page-title">{pageTitle}</span>
          </div>
          <div className="organizer-topbar-actions">
            <ThemeToggle />
            <span className="organizer-live">
              <span aria-hidden="true" />
              Workspace
            </span>
            <button
              type="button"
              className="organizer-ask"
              onClick={() => setAssistantOpen(true)}
              aria-haspopup="dialog"
            >
              <Sparkles size={15} aria-hidden="true" />
              Ask Trybe
            </button>
          </div>
        </header>
        <main
          id="organizer-content"
          className="organizer-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <Dialog
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        title="Ask Trybe"
        description="Your event assistant is coming soon."
        actions={
          <Button onClick={() => setAssistantOpen(false)}>Got it</Button>
        }
      >
        <div className="organizer-assistant-notice">
          <Pin size={22} aria-hidden="true" />
          <strong>Coming soon</strong>
          <p>
            We’re building a helping hand for your events, your audience and
            your next great gathering.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
