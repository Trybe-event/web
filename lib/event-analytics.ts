// Labels, definitions and the CSV for the event analytics page and report. Kept apart
// from React so they are testable. Every figure says what it counts.

type Analytics = {
  registrations: { by_status: Record<string, number>; total: number };
  checkin: {
    enabled: boolean;
    admitted: number;
    checked_in: number;
    not_checked_in: number;
    rate: number | null;
    days: { day: string; checked_in: number }[];
    arrivals: { day: string; hour: number; checked_in: number }[];
  };
  sessions: { title: string; starts_at: string; bookmarks: number }[];
  networking: {
    requests_sent: number;
    requests_accepted: number;
    connections: number;
    conversations: number;
  };
  engagement: {
    questions_asked: number;
    questions_answered: number;
    announcements: number;
    announcement_reach: number;
  };
  questions: {
    label: string;
    kind: string;
    answered: number;
    choices: { choice: string; people: number }[];
  }[];
};

export const STATUS_ROWS = [
  ["active", "Admitted", "Registered and let in (approved, or automatic)"],
  [
    "pending",
    "Waiting for review",
    "Registered; you have not approved or rejected them",
  ],
  ["waitlisted", "Waitlisted", "Registered while the event was full"],
  ["rejected", "Rejected", "Registrations you turned away"],
  ["left", "Left", "Registered, then left the event themselves"],
  ["removed", "Removed", "Removed from the event"],
] as const;

// percent shows a 0..1 rate as a whole percentage, or a dash when there is none.
export function percent(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "–";
  return `${Math.round(rate * 100)}%`;
}

// hoursFor lists all 24 hours of one day, with zero where nobody arrived, so the
// chart's time axis never skips an hour.
export function hoursFor(
  arrivals: { day: string; hour: number; checked_in: number }[],
  day: string,
): { hour: number; checked_in: number }[] {
  const byHour = new Map(
    arrivals.filter((a) => a.day === day).map((a) => [a.hour, a.checked_in]),
  );
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    checked_in: byHour.get(hour) ?? 0,
  }));
}

// busiestHour is the hour with most arrivals on a day, or null with none.
export function busiestHour(hours: { hour: number; checked_in: number }[]) {
  const top = hours.reduce(
    (best, h) => (h.checked_in > best.checked_in ? h : best),
    { hour: -1, checked_in: 0 },
  );
  return top.checked_in > 0 ? top : null;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function cell(value: string | number): string {
  const text = String(value);
  // Quote everything and stop spreadsheets running names as formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// analyticsCsv is the organizer's export: one section per table, each row "section,
// measure, value" so it opens cleanly in any spreadsheet.
export function analyticsCsv(a: Analytics, eventName: string): string {
  const rows: (string | number)[][] = [["Section", "Measure", "Value"]];
  rows.push(["Event", "Name", eventName]);
  for (const [key, label] of STATUS_ROWS)
    rows.push(["Registrations", label, a.registrations.by_status[key] ?? 0]);
  rows.push(["Registrations", "All registrations", a.registrations.total]);
  if (a.checkin.enabled) {
    rows.push(["Check-in", "Admitted", a.checkin.admitted]);
    rows.push(["Check-in", "Checked in at least once", a.checkin.checked_in]);
    rows.push(["Check-in", "Not checked in", a.checkin.not_checked_in]);
    rows.push(["Check-in", "Check-in rate", percent(a.checkin.rate)]);
    for (const d of a.checkin.days)
      rows.push(["Check-in by day", d.day, d.checked_in]);
    for (const h of a.checkin.arrivals)
      rows.push([
        "Arrivals by hour",
        `${h.day} ${hourLabel(h.hour)}`,
        h.checked_in,
      ]);
  }
  for (const s of a.sessions)
    rows.push(["Saved to My agenda", s.title, s.bookmarks]);
  rows.push([
    "Networking",
    "Connection requests sent",
    a.networking.requests_sent,
  ]);
  rows.push([
    "Networking",
    "Requests accepted",
    a.networking.requests_accepted,
  ]);
  rows.push(["Networking", "Connections made", a.networking.connections]);
  rows.push([
    "Networking",
    "Conversations started",
    a.networking.conversations,
  ]);
  rows.push(["Engagement", "Questions asked", a.engagement.questions_asked]);
  rows.push([
    "Engagement",
    "Questions answered",
    a.engagement.questions_answered,
  ]);
  rows.push(["Engagement", "Announcements", a.engagement.announcements]);
  rows.push([
    "Engagement",
    "People reached by announcements",
    a.engagement.announcement_reach,
  ]);
  for (const q of a.questions) {
    rows.push([`Question: ${q.label}`, "Answered", q.answered]);
    for (const c of q.choices)
      rows.push([`Question: ${q.label}`, c.choice, c.people]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
