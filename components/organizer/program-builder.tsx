"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  programDaySchema,
  programDayError,
  sessionSchema,
  sessionScheduleErrors,
} from "@/lib/event-program";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import { localEventTime } from "@/lib/event-time";
import { useEventEditor } from "./event-editor-context";
import { EventTimeInput } from "./event-fields";

type Editor =
  | { kind: "day"; day?: Schemas["ProgramDay"] }
  | {
      kind: "session";
      day: Schemas["ProgramDay"];
      session?: Schemas["Session"];
    };
export function ProgramBuilder() {
  const { event, save, setSectionBusy } = useEventEditor();
  const [program, setProgram] = useState<Schemas["Program"]>();
  const [failure, setFailure] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const programHeading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const [editor, setEditor] = useState<Editor>();
  const editorContainer = useRef<HTMLDivElement>(null);
  const hasSchedule = Boolean(
    event.starts_at && event.ends_at && event.timezone,
  );
  useEffect(() => {
    if (!editor) return;
    editorContainer.current
      ?.querySelector<HTMLElement>("h4")
      ?.focus({ preventScroll: true });
    editorContainer.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [editor]);
  useEffect(() => {
    setSectionBusy("program", Boolean(editor) || busy || !program);
    return () => setSectionBusy("program", false);
  }, [editor, busy, program, setSectionBusy]);
  const [removing, setRemoving] = useState<{
    day?: Schemas["ProgramDay"];
    session?: Schemas["Session"];
  }>();
  async function reload() {
    const { data, error } = await api.GET("/events/{eventId}/program", {
      params: { path: { eventId: event.id } },
      signal: AbortSignal.timeout(15000),
    });
    if (!data) throw new Error(errorMessage(error));
    setProgram(data);
  }
  useEffect(() => {
    let cancelled = false;
    api
      .GET("/events/{eventId}/program", {
        params: { path: { eventId: event.id } },
        signal: AbortSignal.timeout(15000),
      })
      .then(({ data, error }) => {
        if (!cancelled) {
          if (data) setProgram(data);
          else setFailure(errorMessage(error));
        }
      })
      .catch(() => {
        if (!cancelled)
          setFailure("The program couldn't be loaded. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [event.id]);
  async function change(
    request: () => Promise<{ response: Response; error?: unknown }>,
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setFailure(undefined);
    setNotice(undefined);
    setServerErrors({});
    try {
      if (!(await save()))
        throw new Error("Save the event details before updating the program.");
      const result = await request();
      if (!result.response.ok) {
        setServerErrors(fieldErrors(result.error));
        throw new Error(
          [
            errorMessage(result.error),
            ...Object.entries(fieldErrors(result.error)).map(
              ([field, message]) => `${field}: ${message}`,
            ),
          ].join(" "),
        );
      }
      setEditor(undefined);
      setRemoving(undefined);
      try {
        await reload();
        setNotice(
          "Program saved. Your days, sessions and speaker details are up to date.",
        );
        if (editor)
          requestAnimationFrame(() => {
            programHeading.current?.focus({ preventScroll: true });
            programHeading.current?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
              block: "start",
            });
          });
      } catch {
        setFailure(
          "The change was saved, but the program could not refresh. Reload it before making more changes.",
        );
        setProgram(undefined);
      }
      return true;
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Program change failed. Try again.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reorder(dayIndex: number, direction: number, sessionIndex?: number) {
    if (!program) return;
    const days = program.days.map((day) => ({
      id: day.id,
      session_ids: day.sessions.map((session) => session.id),
    }));
    if (sessionIndex === undefined) {
      const moved = days.splice(dayIndex, 1)[0];
      if (moved) days.splice(dayIndex + direction, 0, moved);
    } else {
      const sessions = days[dayIndex]?.session_ids;
      const moved = sessions?.splice(sessionIndex, 1)[0];
      if (sessions && moved)
        sessions.splice(sessionIndex + direction, 0, moved);
    }
    void change(() =>
      api.PUT("/events/{eventId}/program/order", {
        params: { path: { eventId: event.id } },
        body: { days },
      }),
    );
  }
  return (
    <section
      className="space-y-4 border-t border-line pt-6"
      aria-labelledby="program-builder-heading"
    >
      <h3
        ref={programHeading}
        tabIndex={-1}
        id="program-builder-heading"
        className="scroll-mt-28 text-lg font-bold"
      >
        Build your program
      </h3>
      <p className="text-sm text-muted">
        Optionally add days, sessions and speakers. Parallel sessions can share
        a time slot.
      </p>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {!hasSchedule && (
        <p className="text-sm text-muted">
          Complete and save your event dates and timezone in Event basics before
          adding program days.
        </p>
      )}
      {failure && (
        <Alert>
          {failure}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void reload()
                .then(() => setFailure(undefined))
                .catch(() => setFailure("Program reload failed. Try again."));
            }}
          >
            Reload program
          </Button>
        </Alert>
      )}
      {!program && !failure && <Skeleton className="h-32" />}
      {program?.days.map((day, dayIndex) => (
        <Card key={day.id} className="min-w-0 space-y-4">
          <h4 className="font-bold">
            {day.title || "Program day"} · {day.date}
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setEditor({ kind: "day", day })}
            >
              Edit day
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setRemoving({ day })}
            >
              Remove day
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || dayIndex === 0}
              aria-label={`Move ${day.title || day.date} day up`}
              onClick={() => reorder(dayIndex, -1)}
            >
              Move up
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || dayIndex === program.days.length - 1}
              aria-label={`Move ${day.title || day.date} day down`}
              onClick={() => reorder(dayIndex, 1)}
            >
              Move down
            </Button>
          </div>
          {day.sessions.map((session, sessionIndex) => (
            <div
              key={session.id}
              className="space-y-2 rounded-lg border border-line p-3"
            >
              <h5 className="font-semibold">{session.title}</h5>
              {session.description && (
                <p className="whitespace-pre-wrap text-sm text-muted">
                  {session.description}
                </p>
              )}
              <p className="text-sm text-muted">
                {localEventTime(
                  session.starts_at,
                  event.timezone || "UTC",
                ).replace("T", " ")}{" "}
                to{" "}
                {localEventTime(
                  session.ends_at,
                  event.timezone || "UTC",
                ).replace("T", " ")}{" "}
                ({event.timezone || "UTC"})
              </p>
              <p className="text-sm">
                {[session.track, session.room].filter(Boolean).join(" · ")}
              </p>
              {!!session.overlaps_with.length && (
                <Badge>Parallel session</Badge>
              )}
              {session.speakers?.map((speaker, index) => (
                <p className="text-sm" key={index}>
                  {speaker.name}
                  {speaker.role ? ` · ${speaker.role}` : ""}
                </p>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditor({ kind: "session", day, session })}
                >
                  Edit session
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setRemoving({ session })}
                >
                  Remove session
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || sessionIndex === 0}
                  aria-label={`Move ${session.title} up`}
                  onClick={() => reorder(dayIndex, -1, sessionIndex)}
                >
                  Move up
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || sessionIndex === day.sessions.length - 1}
                  aria-label={`Move ${session.title} down`}
                  onClick={() => reorder(dayIndex, 1, sessionIndex)}
                >
                  Move down
                </Button>
              </div>
            </div>
          ))}
          <Button
            size="sm"
            disabled={busy || !hasSchedule}
            onClick={() => setEditor({ kind: "session", day })}
          >
            Add session
          </Button>
        </Card>
      ))}
      {program && (
        <Button
          variant="secondary"
          disabled={busy || !hasSchedule}
          onClick={() => setEditor({ kind: "day" })}
        >
          Add program day
        </Button>
      )}
      <div ref={editorContainer} className="scroll-mt-28">
        {editor?.kind === "day" && (
          <DayEditor
            key={editor.day?.id || "new-day"}
            day={editor.day}
            event={event}
            busy={busy}
            serverErrors={serverErrors}
            onCancel={() => setEditor(undefined)}
            onSave={(body) =>
              change(() =>
                editor.day
                  ? api.PATCH("/events/{eventId}/program/days/{dayId}", {
                      params: {
                        path: { eventId: event.id, dayId: editor.day.id },
                      },
                      body,
                    })
                  : api.POST("/events/{eventId}/program/days", {
                      params: { path: { eventId: event.id } },
                      body,
                    }),
              )
            }
          />
        )}
        {editor?.kind === "session" && (
          <SessionEditor
            key={editor.session?.id || `new-session-${editor.day.id}`}
            editor={editor}
            event={event}
            busy={busy}
            serverErrors={serverErrors}
            onCancel={() => setEditor(undefined)}
            onSave={(body) =>
              change(() =>
                editor.session
                  ? api.PATCH(
                      "/events/{eventId}/program/sessions/{sessionId}",
                      {
                        params: {
                          path: {
                            eventId: event.id,
                            sessionId: editor.session.id,
                          },
                        },
                        body,
                      },
                    )
                  : api.POST(
                      "/events/{eventId}/program/days/{dayId}/sessions",
                      {
                        params: {
                          path: { eventId: event.id, dayId: editor.day.id },
                        },
                        body,
                      },
                    ),
              )
            }
          />
        )}
      </div>
      <Dialog
        open={!!removing}
        onClose={() => {
          if (!busy) setRemoving(undefined);
        }}
        title="Remove from the program?"
        description={
          removing?.day
            ? "Removing a day also removes its sessions and speakers."
            : "This session and its speaker information will be removed."
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setRemoving(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => {
                if (removing?.day)
                  void change(() =>
                    api.DELETE("/events/{eventId}/program/days/{dayId}", {
                      params: {
                        path: { eventId: event.id, dayId: removing.day!.id },
                      },
                    }),
                  );
                else if (removing?.session)
                  void change(() =>
                    api.DELETE(
                      "/events/{eventId}/program/sessions/{sessionId}",
                      {
                        params: {
                          path: {
                            eventId: event.id,
                            sessionId: removing.session!.id,
                          },
                        },
                      },
                    ),
                  );
              }}
            >
              Remove
            </Button>
          </>
        }
      />
    </section>
  );
}
function DayEditor({
  event,
  day,
  busy,
  serverErrors,
  onSave,
  onCancel,
}: {
  event: Schemas["Event"];
  day?: Schemas["ProgramDay"];
  busy: boolean;
  serverErrors: Record<string, string>;
  onSave: (body: Schemas["ProgramDayInput"]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const form = useForm<Schemas["ProgramDayInput"]>({
    resolver: zodResolver(programDaySchema),
    defaultValues: { date: day?.date || "", title: day?.title || "" },
  });
  useEffect(() => {
    for (const [name, message] of Object.entries(serverErrors))
      form.setError(name as keyof Schemas["ProgramDayInput"], { message });
  }, [serverErrors, form]);
  return (
    <Card className="space-y-4">
      <h4 tabIndex={-1} className="font-bold">
        {day ? "Edit day" : "Add day"}
      </h4>
      <Field label="Date" error={form.formState.errors.date?.message}>
        {(props) => (
          <Input
            {...props}
            type="date"
            required
            min={
              event.starts_at
                ? localEventTime(
                    event.starts_at,
                    event.timezone || "UTC",
                  ).slice(0, 10)
                : undefined
            }
            max={
              event.ends_at
                ? localEventTime(event.ends_at, event.timezone || "UTC").slice(
                    0,
                    10,
                  )
                : undefined
            }
            {...form.register("date")}
          />
        )}
      </Field>
      <Field
        label="Day title"
        optional
        error={form.formState.errors.title?.message}
      >
        {(props) => <Input {...props} {...form.register("title")} />}
      </Field>
      <div className="flex gap-2">
        <Button
          loading={busy}
          onClick={() => {
            void form.handleSubmit((body) => {
              const error = programDayError(body.date, event);
              if (error) {
                form.setError("date", { message: error });
                form.setFocus("date");
                return;
              }
              return onSave(body);
            })();
          }}
        >
          Save day
        </Button>
        <Button disabled={busy} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
function SessionEditor({
  editor,
  event,
  busy,
  serverErrors,
  onSave,
  onCancel,
}: {
  editor: Extract<Editor, { kind: "session" }>;
  event: Schemas["Event"];
  busy: boolean;
  serverErrors: Record<string, string>;
  onSave: (body: Schemas["SessionInput"]) => Promise<boolean>;
  onCancel: () => void;
}) {
  const form = useForm<Schemas["SessionInput"]>({
    resolver: zodResolver(sessionSchema),
    defaultValues: editor.session || {
      title: "",
      starts_at: "",
      ends_at: "",
      description: "",
      room: "",
      track: "",
      speakers: [],
    },
  });
  useEffect(() => {
    for (const [name, message] of Object.entries(serverErrors))
      form.setError(name as keyof Schemas["SessionInput"], { message });
  }, [serverErrors, form]);
  const speakers = useFieldArray({ control: form.control, name: "speakers" });
  async function submit(body: Schemas["SessionInput"]) {
    const errors = sessionScheduleErrors(body, editor.day, event);
    if (Object.keys(errors).length) {
      for (const [name, message] of Object.entries(errors))
        form.setError(name as keyof Schemas["SessionInput"], { message });
      form.setFocus(Object.keys(errors)[0] as keyof Schemas["SessionInput"]);
      return;
    }
    await onSave(body);
  }
  return (
    <Card className="space-y-4">
      <h4 tabIndex={-1} className="font-bold">
        {editor.session ? "Edit session" : "Add session"}
      </h4>
      <p className="text-sm text-muted">
        Program day: {editor.day.date}. All session times use{" "}
        {event.timezone || "UTC"}.
      </p>
      {(["title", "room", "track"] as const).map((name) => (
        <Field
          key={name}
          label={
            name === "title"
              ? "Session title"
              : name === "room"
                ? "Room"
                : "Track"
          }
          optional={name !== "title"}
          error={form.formState.errors[name]?.message}
        >
          {(props) => (
            <Input
              {...props}
              required={name === "title"}
              {...form.register(name)}
            />
          )}
        </Field>
      ))}
      <Field
        label="Session description"
        optional
        error={form.formState.errors.description?.message}
      >
        {(props) => <Textarea {...props} {...form.register("description")} />}
      </Field>
      {(["starts_at", "ends_at"] as const).map((name) => (
        <Field
          key={name}
          label={name === "starts_at" ? "Session starts" : "Session ends"}
          hint={event.timezone || "UTC"}
          error={form.formState.errors[name]?.message}
        >
          {(props) => (
            <Controller
              name={name}
              control={form.control}
              render={({ field }) => (
                <EventTimeInput
                  {...props}
                  value={field.value}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  required
                  timezone={event.timezone || "UTC"}
                  onValidationError={(message) =>
                    form.setError(name, { message })
                  }
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
      ))}
      {speakers.fields.map((speaker, index) => (
        <fieldset
          key={speaker.id}
          className="space-y-3 rounded-lg border border-line p-3"
        >
          <legend>Speaker {index + 1}</legend>
          {(["name", "role", "organization", "bio"] as const).map((name) => (
            <Field
              key={name}
              label={`Speaker ${name}`}
              optional={name !== "name"}
              error={form.formState.errors.speakers?.[index]?.[name]?.message}
            >
              {(props) =>
                name === "bio" ? (
                  <Textarea
                    {...props}
                    {...form.register(`speakers.${index}.${name}`)}
                  />
                ) : (
                  <Input
                    {...props}
                    required={name === "name"}
                    {...form.register(`speakers.${index}.${name}`)}
                  />
                )
              }
            </Field>
          ))}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => speakers.remove(index)}
          >
            Remove speaker {index + 1}
          </Button>
        </fieldset>
      ))}
      {speakers.fields.length < 10 && (
        <Button
          variant="secondary"
          onClick={() => speakers.append({ name: "" })}
        >
          Add speaker
        </Button>
      )}
      <div className="flex gap-2">
        <Button
          loading={busy}
          onClick={() => {
            void form.handleSubmit(submit)();
          }}
        >
          Save session
        </Button>
        <Button disabled={busy} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
