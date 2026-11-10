"use client";

import { useFormContext } from "react-hook-form";
import { LockKeyhole, Ticket, Check } from "lucide-react";
import { Field, Select } from "@/components/ui";
import { EventHero } from "@/components/events/event-hero";
import type { Schemas } from "@/lib/api/client";
import type { EventDraft } from "@/lib/event-form";
import { DraftTimeField } from "./event-fields";
import { ProgramBuilder } from "./program-builder";

export function EventTicketNotice() {
  return (
    <div className="organizer-feature-notice">
      <Ticket size={25} aria-hidden="true" />
      <div>
        <h3>Free registration</h3>
        <p>
          Attendees join through your Trybe invitation and confirm their
          profile. No payment is collected.
        </p>
      </div>
      <span className="organizer-feature-status">
        <Check size={14} aria-hidden="true" /> Included
      </span>
      <div className="organizer-upcoming-feature">
        <LockKeyhole size={16} aria-hidden="true" />
        <div>
          <strong>Ticket sales are being built</strong>
          <p>
            Paid tickets, capacity limits, discounts and payouts will appear
            here when available.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EventRegistrationSettings() {
  const form = useFormContext<EventDraft>();
  return (
    <div className="space-y-6">
      <Field
        label="Event visibility"
        error={form.formState.errors.visibility?.message}
      >
        {(props) => (
          <Select {...props} required {...form.register("visibility")}>
            <option value="">Choose visibility</option>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </Select>
        )}
      </Field>
      <p className="text-sm text-muted">
        Public events may appear in discovery. Private events stay out of public
        listings. Anyone with an invitation link can forward it.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <DraftTimeField
          name="registration_opens_at"
          label="Registration opens"
          optional
        />
        <DraftTimeField
          name="registration_closes_at"
          label="Registration closes"
          optional
        />
      </div>
      <p className="text-sm text-muted">
        Leave either boundary empty to keep that boundary unrestricted.
      </p>
      <div className="organizer-registration-fields">
        <h3>What attendees provide</h3>
        <p>
          Trybe uses their verified account and reusable profile. Returning
          attendees review it and explicitly confirm joining.
        </p>
        <dl>
          <div>
            <dt>Full name</dt>
            <dd>Required</dd>
          </div>
          <div>
            <dt>Email address</dt>
            <dd>Verified by Trybe</dd>
          </div>
          <div>
            <dt>Profile photo, role and bio</dt>
            <dd>Required profile</dd>
          </div>
        </dl>
        <p>
          Approval queues, waitlists and custom questions are being built.
          Contact visibility remains under each attendee’s control.
        </p>
      </div>
    </div>
  );
}

export function EventExperienceSettings({
  includeProgram = true,
}: {
  includeProgram?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-semibold">Networking window</h3>
        <p className="mb-4 text-sm text-muted">
          Choose when attendees can discover and connect. Accepted connections
          can continue their conversations after the window closes.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <DraftTimeField
            name="networking_opens_at"
            label="Networking opens"
            optional
          />
          <DraftTimeField
            name="networking_closes_at"
            label="Networking closes"
            optional
          />
        </div>
      </div>
      {includeProgram && (
        <div className="border-t border-line pt-6">
          <h3 className="mb-4 font-semibold">Agenda &amp; lineup</h3>
          <ProgramBuilder />
        </div>
      )}
    </div>
  );
}

export function EventPagePreview({
  event,
  values,
}: {
  event: Schemas["Event"];
  values: EventDraft;
}) {
  let date = "Date to be confirmed";
  if (values.starts_at && Number.isFinite(Date.parse(values.starts_at))) {
    try {
      date = new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: values.timezone || "UTC",
      }).format(new Date(values.starts_at));
    } catch {
      /* The timezone field reports invalid values. */
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Your invitation uses Trybe’s design and the colours from your event
        cover. Attendees can choose their own light or dark theme.
      </p>
      <EventHero
        name={values.name || "Your event"}
        date={date}
        venue={
          values.venue_name ||
          (values.format === "virtual"
            ? "Virtual event"
            : "Venue to be confirmed")
        }
        image={event.image_url}
      />
      <div>
        <h3 className="font-semibold">{values.name || "Your event"}</h3>
        <p className="mt-2 text-sm text-muted whitespace-pre-wrap">
          {values.summary}
        </p>
        <p className="mt-3 text-sm whitespace-pre-wrap">{values.description}</p>
      </div>
      <div className="rounded-lg border border-line p-4">
        <strong className="text-sm">Event invitation</strong>
        <p className="mt-2 break-all text-sm text-muted">
          {event.registration_url ||
            "Publish to generate your six-character event link and QR code."}
        </p>
      </div>
    </div>
  );
}
