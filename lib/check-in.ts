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

// Names compared without case or accents, so "ade" finds "Adé".
function plain(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// searchByName finds people whose first name, surname or any other part of their name
// starts with what was typed. "e" no longer matches every name containing an e, and
// "ola ade" finds "Ade Olawale". Names starting with the whole query come first.
export function searchByName<T extends { attendee_name: string }>(
  people: T[],
  typed: string,
  limit = 8,
): { items: T[]; total: number } {
  const words = plain(typed).split(/\s+/).filter(Boolean);
  if (!words.length) return { items: [], total: 0 };
  const whole = words.join(" ");
  const found = people
    .map((person) => ({ person, name: plain(person.attendee_name) }))
    .filter(({ name }) => {
      const parts = name.split(/[\s'-]+/).filter(Boolean);
      return words.every((word) => parts.some((part) => part.startsWith(word)));
    })
    .sort(
      (a, b) =>
        Number(b.name.startsWith(whole)) - Number(a.name.startsWith(whole)) ||
        a.name.localeCompare(b.name),
    )
    .map(({ person }) => person);
  return { items: found.slice(0, limit), total: found.length };
}
