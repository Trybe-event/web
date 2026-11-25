"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
} from "@/components/ui";
import { ProgramView } from "@/components/events/program-view";
import {
  agenda,
  filterProgram,
  SESSION_KIND_LABELS,
  SESSION_KINDS,
  sessionKindLabel,
} from "@/lib/agenda";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { localEventTime } from "@/lib/event-time";

type Program = Schemas["Program"];

// useBookmarks loads the member's saved sessions and saves or removes one at a time.
// The change shows at once and is undone if the API refuses it.
function useBookmarks(eventId: string) {
  const [saved, setSaved] = useState<Set<string> | null>(null);
  const [failure, setFailure] = useState("");
  useEffect(() => {
    api
      .GET("/events/{eventId}/bookmarks", { params: { path: { eventId } } })
      .then(({ data, error }) =>
        data ? setSaved(new Set(data.items)) : setFailure(errorMessage(error)),
      )
      .catch(() => setFailure("Your saved sessions could not be loaded."));
  }, [eventId]);

  async function toggle(sessionId: string) {
    if (!saved) return;
    const adding = !saved.has(sessionId);
    const flip = (current: Set<string> | null, add: boolean) => {
      const next = new Set(current);
      if (add) next.add(sessionId);
      else next.delete(sessionId);
      return next;
    };
    setSaved((current) => flip(current, adding));
    setFailure("");
    const path = { params: { path: { eventId, sessionId } } };
    try {
      const { error, response } = adding
        ? await api.PUT("/events/{eventId}/bookmarks/{sessionId}", path)
        : await api.DELETE("/events/{eventId}/bookmarks/{sessionId}", path);
      if (response.ok) return;
      setFailure(errorMessage(error));
    } catch {
      setFailure("Could not reach Trybe. Try again.");
    }
    setSaved((current) => flip(current, !adding));
  }

  return { saved, failure, toggle };
}

function SaveButton({
  saved,
  onClick,
}: {
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={saved ? "primary" : "secondary"}
      size="sm"
      aria-pressed={saved}
      onClick={onClick}
    >
      {saved ? (
        <BookmarkCheck size={16} aria-hidden="true" />
      ) : (
        <Bookmark size={16} aria-hidden="true" />
      )}
      {saved ? "In My agenda" : "Save to My agenda"}
    </Button>
  );
}

type Props = {
  eventId: string;
  slug: string;
  program: Program;
  timezone: string;
};

export function MemberProgram({ eventId, slug, program, timezone }: Props) {
  const { saved, failure, toggle } = useBookmarks(eventId);
  const [kind, setKind] = useState("");
  const kinds = SESSION_KINDS.filter((k) =>
    program.days.some((day) => day.sessions.some((s) => s.kind === k)),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {kinds.length > 0 && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Session type
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All sessions</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {SESSION_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </label>
        )}
        <Link
          href={`/events/${encodeURIComponent(slug)}/agenda`}
          className="text-sm font-semibold underline"
        >
          My agenda{saved ? ` (${saved.size})` : ""}
        </Link>
      </div>
      {failure && <Alert>{failure}</Alert>}
      <ProgramView
        program={filterProgram(program, kind)}
        timezone={timezone}
        action={(session) =>
          saved && (
            <SaveButton
              saved={saved.has(session.id)}
              onClick={() => void toggle(session.id)}
            />
          )
        }
      />
    </div>
  );
}

export function MyAgenda({ eventId, slug, program, timezone }: Props) {
  const { saved, failure, toggle } = useBookmarks(eventId);
  const time = (value: string) =>
    localEventTime(value, timezone).replace("T", " ");
  if (failure && !saved) return <Alert>{failure}</Alert>;
  if (!saved) return null;
  const items = agenda(program, saved);
  if (!items.length)
    return (
      <EmptyState title="Nothing saved yet">
        Save sessions from the{" "}
        <Link
          href={`/events/${encodeURIComponent(slug)}/program`}
          className="underline"
        >
          program
        </Link>{" "}
        to build your agenda.
      </EmptyState>
    );
  return (
    <div className="space-y-3">
      {failure && <Alert>{failure}</Alert>}
      <p className="text-sm text-muted">Times are in {timezone}.</p>
      {items.map(({ session, clashesWith }) => (
        <Card key={session.id} className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{session.title}</h2>
              <p className="text-sm text-muted">
                {time(session.starts_at)} to {time(session.ends_at)}
                {session.room ? ` · ${session.room}` : ""}
              </p>
            </div>
            {sessionKindLabel(session.kind) && (
              <Badge>{sessionKindLabel(session.kind)}</Badge>
            )}
          </div>
          {clashesWith.length > 0 && (
            <p className="text-sm font-semibold text-danger">
              Clashes with {clashesWith.map((other) => other.title).join(", ")}
            </p>
          )}
          <SaveButton saved onClick={() => void toggle(session.id)} />
        </Card>
      ))}
    </div>
  );
}
