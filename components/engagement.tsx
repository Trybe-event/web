"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";

type Question = Schemas["EventQuestion"];
type Announcement = Schemas["Announcement"];
type RegistrationQuestion = Schemas["RegistrationQuestion"];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function AnnouncementList({ items }: { items: Announcement[] }) {
  if (!items.length)
    return (
      <EmptyState title="No updates yet">
        The organizer&apos;s announcements will appear here.
      </EmptyState>
    );
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id}>
          <Card>
            <h3 className="font-semibold">{a.title}</h3>
            <p className="text-xs text-muted">{when(a.created_at)}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// MemberUpdates is the attendee's view: announcements, then the event Q&A.
export function MemberUpdates({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>();
  const [questions, setQuestions] = useState<Question[]>();
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const path = { params: { path: { eventId } } };
    Promise.all([
      api.GET("/events/{eventId}/announcements", path),
      api.GET("/events/{eventId}/questions", path),
    ])
      .then(([a, q]) => {
        if (!a.data || !q.data) return setFailed(true);
        setAnnouncements(a.data.items);
        setQuestions(q.data.items);
      })
      .catch(() => setFailed(true));
  }, [eventId]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsking(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const { data, error: failure } = await api.POST(
        "/events/{eventId}/questions",
        { params: { path: { eventId } }, body: { body: draft } },
      );
      if (!data) {
        setError(fieldErrors(failure).body ?? errorMessage(failure));
        return;
      }
      setQuestions([data, ...(questions ?? [])]);
      setDraft("");
      setNotice("Question sent. The organizer reviews questions first.");
    } catch {
      setError("We couldn't send your question. Try again.");
    } finally {
      setAsking(false);
    }
  }

  if (failed)
    return (
      <Alert>Updates could not be loaded. Reload the page to retry.</Alert>
    );
  if (!announcements || !questions)
    return <p className="text-sm text-muted">Loading updates…</p>;
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Announcements</h2>
        <AnnouncementList items={announcements} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Questions</h2>
        <form onSubmit={(e) => void ask(e)} className="space-y-3">
          <Field
            label="Ask the organizer"
            hint="Your name is not shown to other attendees."
            error={error}
          >
            {(props) => (
              <Textarea
                {...props}
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={asking} disabled={!draft.trim()}>
            Send question
          </Button>
          {notice && (
            <p role="status" className="text-sm">
              {notice}
            </p>
          )}
        </form>
        {!questions.length ? (
          <EmptyState title="No questions yet">
            Published questions and answers appear here.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li key={q.id}>
                <Card>
                  <p className="text-sm font-semibold">{q.body}</p>
                  <p className="text-xs text-muted">
                    {q.mine ? "Your question" : "Asked"} · {when(q.created_at)}
                    {q.status === "pending" && " · Waiting for review"}
                  </p>
                  {q.answer && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      <strong>Organizer:</strong> {q.answer}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ModeratedQuestion({
  question,
  onSaved,
}: {
  question: Question;
  onSaved: (q: Question) => void;
}) {
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function save(status: Question["status"]) {
    setBusy(true);
    setError(undefined);
    try {
      const { data, error: failure } = await api.POST(
        "/organizer/questions/{questionId}",
        {
          params: { path: { questionId: question.id } },
          body: { status, answer: answer.trim() || null },
        },
      );
      if (data) onSaved({ ...data, author_name: question.author_name });
      else setError(errorMessage(failure));
    } catch {
      setError("We couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <p className="text-sm font-semibold">{question.body}</p>
      <p className="text-xs text-muted">
        {question.author_name} · {when(question.created_at)} ·{" "}
        {question.status === "published"
          ? "Published"
          : question.status === "hidden"
            ? "Hidden"
            : "Waiting for review"}
      </p>
      <div className="mt-3 space-y-2">
        <Field label="Answer" optional error={error}>
          {(props) => (
            <Textarea
              {...props}
              value={answer}
              maxLength={2000}
              onChange={(e) => setAnswer(e.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={busy}
            onClick={() => void save("published")}
            aria-label={`Publish question: ${question.body}`}
          >
            {question.status === "published" ? "Save answer" : "Publish"}
          </Button>
          {question.status !== "hidden" && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void save("hidden")}
              aria-label={`Hide question: ${question.body}`}
            >
              Hide
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// OrganizerEngagement posts announcements and moderates the event's questions.
export function OrganizerEngagement({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>();
  const [questions, setQuestions] = useState<Question[]>();
  const [failed, setFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    const path = { params: { path: { eventId } } };
    Promise.all([
      api.GET("/organizer/events/{eventId}/announcements", path),
      api.GET("/organizer/events/{eventId}/questions", path),
    ])
      .then(([a, q]) => {
        if (!a.data || !q.data) return setFailed(true);
        setAnnouncements(a.data.items);
        setQuestions(q.data.items);
      })
      .catch(() => setFailed(true));
  }, [eventId]);

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosting(true);
    setErrors({});
    setStatus(undefined);
    try {
      const { data, error } = await api.POST(
        "/organizer/events/{eventId}/announcements",
        { params: { path: { eventId } }, body: { title, body } },
      );
      if (!data) {
        setErrors({ ...fieldErrors(error), form: errorMessage(error) });
        return;
      }
      setAnnouncements([data, ...(announcements ?? [])]);
      setTitle("");
      setBody("");
      setStatus("Announcement posted. Admitted attendees are notified.");
    } catch {
      setErrors({ form: "We couldn't post that. Try again." });
    } finally {
      setPosting(false);
    }
  }

  if (failed)
    return (
      <Alert>Engagement could not be loaded. Reload the page to retry.</Alert>
    );
  if (!announcements || !questions)
    return <p className="text-sm text-muted">Loading…</p>;
  const pending = questions.filter((q) => q.status === "pending");
  const reviewed = questions.filter((q) => q.status !== "pending");
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Post an announcement</h2>
        <form onSubmit={(e) => void post(e)} className="space-y-3">
          <Field label="Title" error={errors.title}>
            {(props) => (
              <Input
                {...props}
                value={title}
                maxLength={180}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </Field>
          <Field label="Message" error={errors.body}>
            {(props) => (
              <Textarea
                {...props}
                value={body}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={posting}>
            Post announcement
          </Button>
          {status && (
            <p role="status" className="text-sm">
              {status}
            </p>
          )}
          {errors.form && !errors.title && !errors.body && (
            <Alert>{errors.form}</Alert>
          )}
        </form>
        <AnnouncementList items={announcements} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Questions to review ({pending.length})
        </h2>
        {!questions.length && (
          <EmptyState title="No questions yet">
            Questions from admitted attendees appear here first.
          </EmptyState>
        )}
        {[...pending, ...reviewed].map((q) => (
          <ModeratedQuestion
            key={q.id}
            question={q}
            onSaved={(saved) =>
              setQuestions(
                questions.map((x) => (x.id === saved.id ? saved : x)),
              )
            }
          />
        ))}
      </section>
    </div>
  );
}

type DraftQuestion = {
  id?: string;
  label: string;
  kind: RegistrationQuestion["kind"];
  options: string;
  required: boolean;
};

const kindLabels: Record<RegistrationQuestion["kind"], string> = {
  short: "Short answer",
  long: "Long answer",
  select: "Single choice",
  multi: "Multiple choice",
};

// RegistrationQuestionsEditor edits what the organizer asks when people register.
export function RegistrationQuestionsEditor({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<DraftQuestion[]>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>();
  const [saving, setSaving] = useState(false);

  const fromApi = (list: RegistrationQuestion[]): DraftQuestion[] =>
    list.map((q) => ({ ...q, options: q.options.join(", ") }));

  useEffect(() => {
    api
      .GET("/organizer/events/{eventId}/registration-questions", {
        params: { path: { eventId } },
      })
      .then(({ data }) => setItems(data ? fromApi(data.items) : []))
      .catch(() => setItems([]));
  }, [eventId]);

  if (!items) return <p className="text-sm text-muted">Loading questions…</p>;
  const update = (i: number, change: Partial<DraftQuestion>) =>
    setItems(items.map((q, j) => (j === i ? { ...q, ...change } : q)));

  async function save() {
    if (!items) return;
    setSaving(true);
    setErrors({});
    setStatus(undefined);
    try {
      const { data, error } = await api.PUT(
        "/organizer/events/{eventId}/registration-questions",
        {
          params: { path: { eventId } },
          body: {
            items: items.map((q) => ({
              ...(q.id ? { id: q.id } : {}),
              label: q.label,
              kind: q.kind,
              required: q.required,
              options: q.options
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean),
            })),
          },
        },
      );
      if (!data) {
        setErrors(fieldErrors(error));
        setStatus(errorMessage(error));
        return;
      }
      setItems(fromApi(data.items));
      setStatus("Registration questions saved.");
    } catch {
      setStatus("We couldn't save the questions. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Attendees answer these when they register. Only you see the answers, on
        the Audience page.
      </p>
      {items.map((q, i) => (
        <Card key={q.id ?? `new-${i}`} className="space-y-3">
          <Field label={`Question ${i + 1}`} error={errors[`items.${i}.label`]}>
            {(props) => (
              <Input
                {...props}
                value={q.label}
                maxLength={200}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            )}
          </Field>
          <Field label="Answer type" error={errors[`items.${i}.kind`]}>
            {(props) => (
              <Select
                {...props}
                value={q.kind}
                onChange={(e) =>
                  update(i, {
                    kind: e.target.value as RegistrationQuestion["kind"],
                  })
                }
              >
                {Object.entries(kindLabels).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {(q.kind === "select" || q.kind === "multi") && (
            <Field
              label="Options"
              hint="Separate options with commas."
              error={errors[`items.${i}.options`]}
            >
              {(props) => (
                <Input
                  {...props}
                  value={q.options}
                  onChange={(e) => update(i, { options: e.target.value })}
                />
              )}
            </Field>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              Required
            </label>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              aria-label={`Remove question ${i + 1}`}
            >
              Remove
            </Button>
          </div>
        </Card>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={items.length >= 20}
          onClick={() =>
            setItems([
              ...items,
              { label: "", kind: "short", options: "", required: false },
            ])
          }
        >
          Add question
        </Button>
        <Button loading={saving} onClick={() => void save()}>
          Save questions
        </Button>
      </div>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </div>
  );
}

// RegistrationAnswers collects answers on the join step and reports them up.
export function RegistrationAnswers({
  questions,
  values,
  errors,
  onChange,
}: {
  questions: RegistrationQuestion[];
  values: Record<string, string | string[]>;
  errors: Record<string, string>;
  onChange: (values: Record<string, string | string[]>) => void;
}) {
  if (!questions.length) return null;
  const set = (id: string, value: string | string[]) =>
    onChange({ ...values, [id]: value });
  return (
    <div className="w-full space-y-4">
      {questions.map((q) => {
        const error = errors[`answers.${q.id}`];
        const value = values[q.id];
        if (q.kind === "multi")
          return (
            <fieldset key={q.id} className="space-y-2">
              <legend className="text-sm font-semibold">
                {q.label}
                {!q.required && (
                  <span className="ml-1 font-normal text-muted">
                    (optional)
                  </span>
                )}
              </legend>
              {q.options.map((option) => {
                const chosen = Array.isArray(value) ? value : [];
                return (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(option)}
                      onChange={(e) =>
                        set(
                          q.id,
                          e.target.checked
                            ? [...chosen, option]
                            : chosen.filter((c) => c !== option),
                        )
                      }
                    />
                    {option}
                  </label>
                );
              })}
              {error && (
                <p className="text-sm font-medium text-danger">{error}</p>
              )}
            </fieldset>
          );
        return (
          <Field
            key={q.id}
            label={q.label}
            optional={!q.required}
            error={error}
          >
            {(props) =>
              q.kind === "select" ? (
                <Select
                  {...props}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => set(q.id, e.target.value)}
                >
                  <option value="">Choose one</option>
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : q.kind === "long" ? (
                <Textarea
                  {...props}
                  maxLength={2000}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              ) : (
                <Input
                  {...props}
                  maxLength={200}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )
            }
          </Field>
        );
      })}
    </div>
  );
}
