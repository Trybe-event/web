// Session types and My agenda, kept apart from React so they are testable.

export const SESSION_KINDS = [
  "keynote",
  "talk",
  "workshop",
  "panel",
  "practical",
  "social",
  "break",
] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  keynote: "Keynote",
  talk: "Talk",
  workshop: "Workshop",
  panel: "Panel",
  practical: "Practical",
  social: "Social",
  break: "Break",
};

export function sessionKindLabel(kind: string | null | undefined) {
  return kind && kind in SESSION_KIND_LABELS
    ? SESSION_KIND_LABELS[kind as SessionKind]
    : null;
}

type Session = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind?: string | null;
};
type Program<S extends Session> = {
  days: { id: string; sessions: S[] }[];
};

// filterProgram keeps sessions of one type; empty means every session.
export function filterProgram<S extends Session, P extends Program<S>>(
  program: P,
  kind: string,
): P {
  if (!kind) return program;
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      sessions: day.sessions.filter((session) => session.kind === kind),
    })),
  };
}

// agenda is the saved sessions in time order, each with the other saved sessions it
// clashes with. Ids of sessions no longer in the program are ignored.
export function agenda<S extends Session>(
  program: Program<S>,
  saved: Iterable<string>,
): { session: S; clashesWith: S[] }[] {
  const ids = new Set(saved);
  const picked = program.days
    .flatMap((day) => day.sessions)
    .filter((session) => ids.has(session.id))
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        Date.parse(a.ends_at) - Date.parse(b.ends_at),
    );
  return picked.map((session) => ({
    session,
    clashesWith: picked.filter(
      (other) =>
        other.id !== session.id &&
        Date.parse(other.starts_at) < Date.parse(session.ends_at) &&
        Date.parse(session.starts_at) < Date.parse(other.ends_at),
    ),
  }));
}
