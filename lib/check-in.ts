// Pure helpers for the check-in desk, kept apart from React so they are testable.

export type CheckInRow = {
  registration_id: string;
  attendee_name: string;
  event_day: string;
  checked_in_at: string;
  method: "scan" | "manual";
};

// passCode takes what a camera or handheld scanner read. The QR holds the bare code;
// a scanner may add spaces or a line break.
export function passCode(raw: string): string {
  return raw.trim();
}

function csvCell(value: string): string {
  // Quote everything; neutralise spreadsheet formulas in names.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function checkInsCsv(rows: CheckInRow[]): string {
  const header = ["Name", "Event day", "Checked in at (UTC)", "Method"];
  const lines = rows.map((row) =>
    [row.attendee_name, row.event_day, row.checked_in_at, row.method]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

// checkedInToday is the set of registrations already in on the given event day.
export function checkedInOn(rows: CheckInRow[], day: string): Set<string> {
  return new Set(
    rows
      .filter((row) => row.event_day === day)
      .map((row) => row.registration_id),
  );
}

// eventToday is today's date (YYYY-MM-DD) in the event's time zone, as the API dates check-ins.
export function eventToday(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
