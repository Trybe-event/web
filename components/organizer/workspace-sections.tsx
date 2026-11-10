"use client";

import {
  Bell,
  Building2,
  CreditCard,
  LockKeyhole,
  Pin,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage, fieldErrors } from "@/lib/api/client";
import { legalContact } from "@/lib/legal";

export function OrganizerPayments() {
  return (
    <section className="organizer-empty organizer-feature-notice">
      <CreditCard size={28} aria-hidden="true" />
      <h2>Payments are coming to Trybe.</h2>
      <p>
        Paid tickets, transactions and payouts will appear here when payments
        are available. You can create free events today.
      </p>
    </section>
  );
}

export function OrganizerAudience({
  registrationTotal,
}: {
  registrationTotal: number | null;
}) {
  const [status, setStatus] = useState("All people");
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="organizer-list-toolbar">
        <div
          className="organizer-tabs"
          role="group"
          aria-label="Audience status"
        >
          {["All people", "Pending", "Approved", "Waitlisted", "Rejected"].map(
            (label) => (
              <button
                key={label}
                type="button"
                aria-pressed={status === label}
                onClick={() => setStatus(label)}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="organizer-audience-count">
        <label className="organizer-search">
          <span className="sr-only">Search audience</span>
          <input
            type="search"
            placeholder="Search name, email or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span>
          {registrationTotal === null
            ? "Totals unavailable"
            : `${registrationTotal.toLocaleString("en")} event registrations`}
        </span>
      </div>
      <div className="organizer-empty organizer-feature-notice">
        <Users size={26} aria-hidden="true" />
        <h2>
          {status === "All people"
            ? "Your audience, in one place."
            : `${status} registrations`}
        </h2>
        <p>
          The audience directory and approval filters are being built.
          Individual attendee records are not available in this view yet.
        </p>
        <p>
          Event registration totals are live sign-up counts, not unique people
          or verified attendance.
        </p>
      </div>
    </>
  );
}

const settingSections = [
  { label: "Business", icon: Building2 },
  { label: "Team", icon: Users },
  { label: "Notifications", icon: Bell },
  { label: "Security", icon: LockKeyhole },
  { label: "Payments & payouts", icon: CreditCard },
] as const;

export function BusinessProfileForm({
  organization: savedOrganization,
  ownerName,
}: {
  organization: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [organization, setOrganization] = useState(savedOrganization);
  const [fullName, setFullName] = useState(ownerName);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    { tone: "danger" | "success"; text: string } | undefined
  >();
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(undefined);
    setErrors({});
    setSaving(true);
    try {
      const { data, error, response } = await api.PUT("/me/account", {
        body: { organization, full_name: fullName },
      });
      if (data) {
        // Show the names as the API cleaned and saved them.
        setOrganization(data.organization ?? "");
        setFullName(data.full_name);
        setStatus({ tone: "success", text: "Business profile saved." });
        // The sidebar and header read the account on the server.
        router.refresh();
      } else if (response.status === 400) {
        setErrors(fieldErrors(error));
        setStatus({ tone: "danger", text: "Some fields need attention." });
      } else {
        setStatus({ tone: "danger", text: errorMessage(error) });
      }
    } catch {
      setStatus({
        tone: "danger",
        text: "We couldn't save your changes. Your details are still here. Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold">Business profile</h2>
      <p className="mt-1 text-xs text-muted">
        Your business name appears on your event pages.
      </p>
      <form onSubmit={(event) => void save(event)} noValidate>
        <div className="organizer-settings-fields">
          <Field label="Business name" error={errors.organization}>
            {(props) => (
              <Input
                {...props}
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                maxLength={160}
                autoComplete="organization"
                required
              />
            )}
          </Field>
          <Field label="Account type">
            {(props) => <Input {...props} value="Organizer" readOnly />}
          </Field>
          <Field label="Contact name" error={errors.full_name}>
            {(props) => (
              <Input
                {...props}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                required
              />
            )}
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
        {status && (
          <div className="mt-4">
            <Alert tone={status.tone}>{status.text}</Alert>
          </div>
        )}
      </form>
    </Card>
  );
}

export function OrganizerSettings({
  organization,
  ownerName,
}: {
  organization: string;
  ownerName: string;
}) {
  const [section, setSection] = useState<string>("Business");
  return (
    <div className="organizer-settings-layout">
      <nav aria-label="Workspace settings" className="organizer-settings-nav">
        {settingSections.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-pressed={section === label}
            onClick={() => setSection(label)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="space-y-5">
        {section === "Business" && (
          <BusinessProfileForm
            organization={organization}
            ownerName={ownerName}
          />
        )}
        {section === "Team" && (
          <Card>
            <h2 className="text-base font-semibold">Your team</h2>
            <div className="organizer-team-owner">
              <strong>{ownerName}</strong>
              <span>Business owner</span>
            </div>
            <p className="text-sm text-muted">
              Team invitations and additional permissions are coming soon.
            </p>
          </Card>
        )}
        {section === "Notifications" && (
          <Card>
            <h2 className="text-base font-semibold">Email & notifications</h2>
            <p className="mt-3 text-sm text-muted">
              Trybe supports event-created emails, event reminders and event
              summaries. Per-organizer notification controls are being built.
            </p>
            <p className="mt-3 text-xs text-muted">
              Delivery depends on the configured mail service. This page does
              not change email delivery settings.
            </p>
          </Card>
        )}
        {section === "Security" && (
          <>
            <Card>
              <h2 className="text-base font-semibold">Account access</h2>
              <div className="organizer-settings-fields">
                <label>
                  Name
                  <Input value={ownerName} readOnly />
                </label>
                <label>
                  Role
                  <Input value="Business owner" readOnly />
                </label>
              </div>
              <p className="mt-4 text-sm text-muted">
                Organizer and attendee identities use separate workspaces.
              </p>
            </Card>
            <Card>
              <h2 className="text-base font-semibold">
                Password & signed-in devices
              </h2>
              <p className="mt-3 text-sm text-muted">
                Use “Forgot password?” on the organizer sign-in page to reset
                your password. Device management in this workspace is coming
                soon.
              </p>
            </Card>
          </>
        )}
        {section === "Payments & payouts" && <OrganizerPayments />}
        <div className="organizer-settings-support">
          <Pin size={14} aria-hidden="true" />
          <span>
            Need help?{" "}
            <a href={`mailto:${legalContact.email}`}>{legalContact.email}</a>
          </span>
        </div>
      </div>
    </div>
  );
}
