import Link from "next/link";
import { Bell, Fingerprint, Pencil, ShieldCheck, Tags } from "lucide-react";

export function AttendeeProfileMenu() {
  return (
    <section className="attendee-profile-menu" aria-label="Profile settings">
      <h2>Make Trybe yours</h2>
      {[
        {
          title: "Edit profile",
          description: "Your name, photo and professional details",
          href: "/attendee/profile/edit",
          icon: Pencil,
        },
        {
          title: "Interests & networking goals",
          description: "Help the right people find you",
          href: "/attendee/profile/edit#networking-profile",
          icon: Tags,
        },
        {
          title: "Notifications",
          description: "Choose the updates you want to receive",
          href: "/attendee/notifications/preferences",
          icon: Bell,
        },
        {
          title: "Privacy & visibility",
          description: "Control your contacts and connection requests",
          href: "/attendee/profile/settings",
          icon: ShieldCheck,
        },
        {
          title: "Account actions",
          description: "Sign out or manage account deletion",
          href: "#account-actions",
          icon: Fingerprint,
        },
      ].map(({ title, description, href, icon: Icon }) => (
        <Link key={href} href={href}>
          <Icon size={19} aria-hidden="true" />
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
        </Link>
      ))}
    </section>
  );
}
