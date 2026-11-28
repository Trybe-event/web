"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button, Card, Select } from "@/components/ui";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/agenda";
import {
  analyticsCsv,
  busiestHour,
  hourLabel,
  hoursFor,
  percent,
  STATUS_ROWS,
} from "@/lib/event-analytics";
import type { EventAnalytics } from "@/lib/organizer-dashboard";

import { BarList, HourColumns } from "./analytics-charts";

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <Card className="organizer-event-stat">
      <span>{label}</span>
      <strong className="tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en") : value}
      </strong>
      <p>{note}</p>
    </Card>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{intro}</p>
      </div>
      {children}
    </Card>
  );
}

export function EventAnalyticsView({
  analytics: a,
  eventName,
  timezone,
}: {
  analytics: EventAnalytics;
  eventName: string;
  timezone: string;
}) {
  const days = a.checkin.days.map((d) => d.day);
  const [day, setDay] = useState(days.at(-1) ?? "");
  const hours = hoursFor(a.checkin.arrivals, day);
  const peak = busiestHour(hours);

  function download() {
    const blob = new Blob([analyticsCsv(a, eventName)], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${eventName.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Live figures, updated{" "}
          {new Date(a.generated_at).toLocaleString("en", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          . Counts only: names, contact details and messages are never shown
          here.
        </p>
        <Button variant="secondary" size="sm" onClick={download}>
          <Download size={16} aria-hidden="true" /> Download CSV
        </Button>
      </div>

      <section
        aria-label="Headline figures"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Tile
          label="Registrations"
          value={a.registrations.total}
          note="Everyone who registered, whatever their status."
        />
        <Tile
          label="Admitted"
          value={a.registrations.by_status.active ?? 0}
          note="Registered and let in."
        />
        {a.checkin.enabled ? (
          <Tile
            label="Check-in rate"
            value={percent(a.checkin.rate)}
            note="Admitted people checked in at least once."
          />
        ) : (
          <Tile
            label="Check-in"
            value="Off"
            note="Turn it on in Edit event to count arrivals."
          />
        )}
        <Tile
          label="Connections made"
          value={a.networking.connections}
          note="People who connected at this event."
        />
      </section>

      <Section
        title="Registrations by status"
        intro="A person counts once, under their current status."
      >
        <BarList
          unit="people"
          rows={STATUS_ROWS.map(([key, label, note]) => ({
            label,
            value: a.registrations.by_status[key] ?? 0,
            note,
          })).filter((row) => row.value > 0 || row.label === "Admitted")}
        />
      </Section>

      {a.checkin.enabled && (
        <Section
          title="Check-in"
          intro={`Arrivals at the venue, in ${timezone}. Registration is not attendance; these are the people scanned or checked in by name.`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile
              label="Checked in"
              value={a.checkin.checked_in}
              note="Admitted people checked in at least once."
            />
            <Tile
              label="Not checked in"
              value={a.checkin.not_checked_in}
              note="Admitted people never checked in."
            />
            <Tile
              label="Rate"
              value={percent(a.checkin.rate)}
              note="Checked in over admitted."
            />
          </div>
          {a.checkin.days.length > 1 && (
            <div>
              <h3 className="mb-2 font-semibold">By day</h3>
              <BarList
                unit="checked in"
                rows={a.checkin.days.map((d) => ({
                  label: d.day,
                  value: d.checked_in,
                }))}
              />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-semibold">Arrivals by hour</h3>
              {days.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  Day
                  <Select value={day} onChange={(e) => setDay(e.target.value)}>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            </div>
            {days.length ? (
              <>
                <p className="text-sm text-muted">
                  {peak
                    ? `Busiest hour on ${day}: ${hourLabel(peak.hour)}, with ${peak.checked_in} checked in.`
                    : `No arrivals on ${day}.`}
                </p>
                <HourColumns hours={hours} />
                <details>
                  <summary className="cursor-pointer text-sm">
                    View hourly data
                  </summary>
                  <table className="organizer-data-table">
                    <thead>
                      <tr>
                        <th scope="col">Hour</th>
                        <th scope="col">Checked in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hours
                        .filter((h) => h.checked_in > 0)
                        .map((h) => (
                          <tr key={h.hour}>
                            <th scope="row">{hourLabel(h.hour)}</th>
                            <td>{h.checked_in}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </details>
              </>
            ) : (
              <p className="text-sm text-muted">Nobody has checked in yet.</p>
            )}
          </div>
        </Section>
      )}

      <Section
        title="Session interest"
        intro="Admitted attendees who saved each session to My agenda."
      >
        <BarList
          unit="saved it"
          empty="No sessions in the program yet."
          rows={a.sessions.map((s) => ({
            label: s.kind
              ? `${s.title} (${SESSION_KIND_LABELS[s.kind as SessionKind] ?? s.kind})`
              : s.title,
            value: s.bookmarks,
          }))}
        />
      </Section>

      <Section
        title="Networking and engagement"
        intro="Counts only. Who connected and what they wrote stay private."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Requests sent"
            value={a.networking.requests_sent}
            note="Connection requests sent at this event."
          />
          <Tile
            label="Requests accepted"
            value={a.networking.requests_accepted}
            note="Of those, accepted."
          />
          <Tile
            label="Conversations"
            value={a.networking.conversations}
            note="Started from connections made here."
          />
          <Tile
            label="Questions"
            value={`${a.engagement.questions_answered} of ${a.engagement.questions_asked}`}
            note="Answered, of all questions asked."
          />
          <Tile
            label="Announcements"
            value={a.engagement.announcements}
            note="Updates you posted."
          />
          <Tile
            label="Announcement reach"
            value={a.engagement.announcement_reach}
            note="People who received at least one in Trybe."
          />
        </div>
      </Section>

      {a.questions.length > 0 && (
        <Section
          title="Registration questions"
          intro="How registrations answered. Written answers are counted, not shown here; read them on the Attendance page."
        >
          <div className="space-y-6">
            {a.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <h3 className="font-semibold">{q.label}</h3>
                <p className="text-sm text-muted">
                  {q.answered.toLocaleString("en")} answered
                  {q.kind === "multi" ? " (several choices allowed)" : ""}.
                </p>
                {q.choices.length > 0 && (
                  <BarList
                    unit="people"
                    rows={q.choices.map((c) => ({
                      label: c.choice,
                      value: c.people,
                    }))}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
