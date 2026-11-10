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
import { useState } from "react";
import { SignedInDevices } from "@/components/organizer/signed-in-devices";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { api, errorMessage, fieldErrors } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { legalContact } from "@/lib/legal";
import type { Account } from "@/lib/session";

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

type SettingsAccount = Account;
type Business = NonNullable<Account["business"]>;
type AccountInput = components["schemas"]["OrganizerAccountInput"];

const defaultBusiness: Business = {
  support_email: null,
  support_phone: null,
  website: null,
  city: null,
  country_code: "NG",
  timezone: "Africa/Lagos",
  about: "",
  notify_event_updates: true,
  notify_event_summaries: true,
};

const timezones = [
  ["Africa/Lagos", "West Africa Time (Lagos)"],
  ["Africa/Accra", "Greenwich Mean Time (Accra)"],
  ["Africa/Nairobi", "East Africa Time (Nairobi)"],
  ["Africa/Johannesburg", "South Africa (Johannesburg)"],
  ["Europe/London", "London"],
  ["America/New_York", "New York"],
] as const;

// PUT /me/account replaces everything, so every save sends the whole saved profile.
function accountInput(account: SettingsAccount): AccountInput {
  const b = account.business ?? defaultBusiness;
  return {
    full_name: account.full_name,
    organization: account.organization ?? "",
    support_email: b.support_email,
    support_phone: b.support_phone,
    website: b.website,
    city: b.city,
    country_code: b.country_code,
    timezone: b.timezone,
    about: b.about,
    notify_event_updates: b.notify_event_updates,
    notify_event_summaries: b.notify_event_summaries,
  };
}

type SaveStatus = { tone: "danger" | "success"; text: string } | undefined;

function useAccountSave(onSaved: (account: SettingsAccount) => void) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>();
  const [saving, setSaving] = useState(false);
  async function save(body: AccountInput, success: string) {
    setStatus(undefined);
    setErrors({});
    setSaving(true);
    try {
      const { data, error, response } = await api.PUT("/me/account", {
        body,
      });
      if (data) {
        onSaved(data);
        setStatus({ tone: "success", text: success });
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
  return { errors, status, saving, save };
}

function SaveFooter({
  saving,
  status,
  label,
}: {
  saving: boolean;
  status: SaveStatus;
  label: string;
}) {
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving}>
          {label}
        </Button>
      </div>
      {status && (
        <div className="mt-4">
          <Alert tone={status.tone}>{status.text}</Alert>
        </div>
      )}
    </>
  );
}

export function BusinessProfileForm({
  account,
  onSaved,
}: {
  account: SettingsAccount;
  onSaved: (account: SettingsAccount) => void;
}) {
  const [form, setForm] = useState(accountInput(account));
  const { errors, status, saving, save } = useAccountSave((saved) => {
    // Show the values as the API cleaned and saved them.
    setForm(accountInput(saved));
    onSaved(saved);
  });
  const set =
    (key: keyof AccountInput) => (event: { target: { value: string } }) =>
      setForm({ ...form, [key]: event.target.value });
  const text = (value: string | null | undefined) => value ?? "";
  const zoneKnown = timezones.some(([zone]) => zone === form.timezone);

  return (
    <Card>
      <h2 className="text-base font-semibold">Business profile</h2>
      <p className="mt-1 text-xs text-muted">
        The details attendees see on your event pages and use to reach you.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(form, "Business profile saved.");
        }}
        noValidate
      >
        <div className="organizer-settings-fields">
          <Field label="Business name" error={errors.organization}>
            {(props) => (
              <Input
                {...props}
                value={form.organization}
                onChange={set("organization")}
                maxLength={160}
                autoComplete="organization"
                required
              />
            )}
          </Field>
          <Field label="Account type" hint="Set at sign-up. It can't change.">
            {(props) => <Input {...props} value="Organizer" readOnly />}
          </Field>
          <Field label="Contact name" error={errors.full_name}>
            {(props) => (
              <Input
                {...props}
                value={form.full_name}
                onChange={set("full_name")}
                maxLength={120}
                autoComplete="name"
                required
              />
            )}
          </Field>
          <Field
            label="Support email"
            optional
            hint="Shown on your event pages so attendees can reach you."
            error={errors.support_email}
          >
            {(props) => (
              <Input
                {...props}
                type="email"
                value={text(form.support_email)}
                onChange={set("support_email")}
                maxLength={320}
                placeholder="support@yourbusiness.com"
              />
            )}
          </Field>
          <Field
            label="Support phone"
            optional
            hint="International format. Shown on your event pages."
            error={errors.support_phone}
          >
            {(props) => (
              <Input
                {...props}
                type="tel"
                value={text(form.support_phone)}
                onChange={set("support_phone")}
                maxLength={16}
                placeholder="+2348012345678"
              />
            )}
          </Field>
          <Field label="Website" optional error={errors.website}>
            {(props) => (
              <Input
                {...props}
                type="url"
                value={text(form.website)}
                onChange={set("website")}
                maxLength={300}
                placeholder="https://yourbusiness.com"
              />
            )}
          </Field>
          <Field label="City" optional error={errors.city}>
            {(props) => (
              <Input
                {...props}
                value={text(form.city)}
                onChange={set("city")}
                maxLength={120}
                autoComplete="address-level2"
                placeholder="Lagos"
              />
            )}
          </Field>
          <Field label="Country code" error={errors.country_code}>
            {(props) => (
              <Input
                {...props}
                value={text(form.country_code)}
                onChange={set("country_code")}
                maxLength={2}
                autoComplete="country"
                required
              />
            )}
          </Field>
          <Field
            label="Time zone"
            hint="Used as the starting time zone for new events."
            error={errors.timezone}
          >
            {(props) => (
              <Select
                {...props}
                value={form.timezone}
                onChange={set("timezone")}
              >
                {!zoneKnown && form.timezone && (
                  <option value={form.timezone}>{form.timezone}</option>
                )}
                {timezones.map(([zone, label]) => (
                  <option key={zone} value={zone}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="About the business"
            optional
            hint="A short description attendees can recognise and trust."
            error={errors.about}
          >
            {(props) => (
              <Textarea
                {...props}
                value={text(form.about)}
                onChange={set("about")}
                maxLength={1500}
              />
            )}
          </Field>
        </div>
        <SaveFooter saving={saving} status={status} label="Save changes" />
      </form>
    </Card>
  );
}

export function NotificationSettings({
  account,
  onSaved,
}: {
  account: SettingsAccount;
  onSaved: (account: SettingsAccount) => void;
}) {
  const business = account.business ?? defaultBusiness;
  const [updates, setUpdates] = useState(business.notify_event_updates);
  const [summaries, setSummaries] = useState(business.notify_event_summaries);
  const { status, saving, save } = useAccountSave(onSaved);
  return (
    <Card>
      <h2 className="text-base font-semibold">Email & notifications</h2>
      <p className="mt-1 text-xs text-muted">
        Choose which emails Trybe sends to your sign-in email.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(
            {
              ...accountInput(account),
              notify_event_updates: updates,
              notify_event_summaries: summaries,
            },
            "Email preferences saved.",
          );
        }}
      >
        <div className="mt-4 space-y-4">
          <Switch
            label="Event updates"
            description="When an event is published, starts, is about to end, and when it has ended."
            checked={updates}
            onChange={setUpdates}
          />
          <Switch
            label="Event summaries"
            description="A recap of registrations and networking after each event ends."
            checked={summaries}
            onChange={setSummaries}
          />
        </div>
        <SaveFooter saving={saving} status={status} label="Save preferences" />
      </form>
    </Card>
  );
}

export function OrganizerSettings({ account }: { account: SettingsAccount }) {
  const [section, setSection] = useState<string>("Business");
  const [saved, setSaved] = useState(account);
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
          <BusinessProfileForm account={saved} onSaved={setSaved} />
        )}
        {section === "Team" && (
          <Card>
            <h2 className="text-base font-semibold">Your team</h2>
            <div className="organizer-team-owner">
              <strong>{saved.full_name}</strong>
              <span>Business owner</span>
            </div>
            <p className="text-sm text-muted">
              Team invitations and additional permissions are coming soon.
            </p>
          </Card>
        )}
        {section === "Notifications" && (
          <NotificationSettings account={saved} onSaved={setSaved} />
        )}
        {section === "Security" && (
          <>
            <Card>
              <h2 className="text-base font-semibold">Account access</h2>
              <div className="organizer-settings-fields">
                <label>
                  Name
                  <Input value={saved.full_name} readOnly />
                </label>
                <label>
                  Role
                  <Input value="Business owner" readOnly />
                </label>
              </div>
              <p className="mt-4 text-sm text-muted">
                To change your password, sign out and use “Forgot password?” on
                the organizer sign-in page.
              </p>
            </Card>
            <Card>
              <h2 className="text-base font-semibold">Signed-in devices</h2>
              <p className="mt-1 mb-4 text-xs text-muted">
                Browsers signed in to your organizer account. Signing out others
                keeps only this device.
              </p>
              <SignedInDevices />
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
