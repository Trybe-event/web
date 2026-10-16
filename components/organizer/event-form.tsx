"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { Alert, Button, Card, Field, Input, Skeleton } from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import {
  eventDraftSchema,
  eventDraftValues,
  type EventDraft,
} from "@/lib/event-form";

const STAGES = ["Event basics", "Details and program", "Settings and review"];
export function EventForm({
  eventId,
  organizerId,
  details,
  settings,
  basics,
}: {
  eventId?: string;
  organizerId: string;
  basics?: ReactNode;
  details?: ReactNode;
  settings?: ReactNode;
}) {
  const router = useRouter();
  const form = useForm<EventDraft>({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {},
  });
  const [event, setEvent] = useState<Schemas["Event"]>();
  const [activeStage, setActiveStage] = useState(0);
  const [status, setStatus] = useState("Loading draft...");
  const [failure, setFailure] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(false);
  const currentEvent = useRef<Schemas["Event"] | undefined>(undefined);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const saving = useRef<Promise<boolean> | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sections = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    const storageKey = `trybe-event-create:${organizerId}`;
    async function load() {
      setFailure(undefined);
      setStatus("Loading draft...");
      try {
        let result;
        if (eventId)
          result = await api.GET("/events/{eventId}", {
            params: { path: { eventId } },
            signal: AbortSignal.timeout(15000),
          });
        else {
          let key = sessionStorage.getItem(storageKey);
          if (!key) {
            key = crypto.randomUUID();
            sessionStorage.setItem(storageKey, key);
          }
          result = await api.POST("/events", {
            params: { header: { "Idempotency-Key": key } },
            body: {},
            signal: AbortSignal.timeout(15000),
          });
        }
        if (!result.data || !result.response.ok)
          throw new Error(errorMessage(result.error));
        if (cancelled) return;
        currentEvent.current = result.data;
        setEvent(result.data);
        form.reset(eventDraftValues(result.data));
        revision.current = savedRevision.current = 0;
        loaded.current = true;
        setStatus("Saved");
        if (!eventId)
          router.replace(`/organizer/events/${result.data.id}/edit`);
        else sessionStorage.removeItem(storageKey);
      } catch (error) {
        if (!cancelled) {
          setStatus("Not saved");
          setFailure(
            error instanceof Error
              ? error.message
              : "We couldn't open this draft. Try again.",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      loaded.current = false;
      clearTimeout(timer.current);
    };
  }, [eventId, organizerId, attempt, form, router]);

  async function save(): Promise<boolean> {
    if (saving.current) return saving.current;
    const pending = async () => {
      while (savedRevision.current < revision.current) {
        const snapshot = revision.current;
        if (!currentEvent.current || !(await form.trigger())) {
          setStatus("Unsaved changes");
          return false;
        }
        setStatus("Saving...");
        setFailure(undefined);
        try {
          const { data, error, response } = await api.PATCH(
            "/events/{eventId}",
            {
              params: { path: { eventId: currentEvent.current.id } },
              body: form.getValues(),
              signal: AbortSignal.timeout(15000),
            },
          );
          if (!response.ok || !data) {
            for (const [name, message] of Object.entries(fieldErrors(error)))
              form.setError(name as FieldPath<EventDraft>, { message });
            throw new Error(errorMessage(error));
          }
          savedRevision.current = snapshot;
          currentEvent.current = data;
          setEvent(data);
        } catch (error) {
          setStatus("Unsaved changes");
          setFailure(
            error instanceof Error
              ? error.message
              : "Save failed. Your changes are still here.",
          );
          return false;
        }
      }
      setStatus("Saved");
      return true;
    };
    saving.current = pending().finally(() => {
      saving.current = undefined;
    });
    return saving.current;
  }
  const saveLatest = useRef(save);
  useEffect(() => {
    saveLatest.current = save;
  });
  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        if (!loaded.current) return;
        revision.current++;
        setStatus("Unsaved changes");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          void saveLatest.current();
        }, 800);
      },
    });
    const beforeUnload = (browserEvent: BeforeUnloadEvent) => {
      if (revision.current !== savedRevision.current) {
        browserEvent.preventDefault();
        browserEvent.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", beforeUnload);
      clearTimeout(timer.current);
    };
  }, [form]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top,
          )[0];
        if (visible)
          setActiveStage(Number((visible.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    sections.current.forEach((section) => {
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [event]);
  function navigate(stage: number) {
    setActiveStage(stage);
    sections.current[stage]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    sections.current[stage]
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
  }
  if (!event)
    return failure ? (
      <Alert>
        {failure}
        <Button
          className="mt-3"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry loading
        </Button>
      </Alert>
    ) : (
      <Skeleton className="mt-8 h-96" />
    );
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          void save();
        }}
        className="mt-6 space-y-6"
      >
        <nav
          aria-label="Event setup stages"
          className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-line bg-paper py-3"
        >
          {STAGES.map((label, index) => (
            <Button
              key={label}
              variant={activeStage === index ? "primary" : "secondary"}
              aria-current={activeStage === index ? "step" : undefined}
              onClick={() => navigate(index)}
            >
              {index + 1}. {label}
            </Button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-muted">
            {status}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void save();
            }}
          >
            Save now
          </Button>
          <span className="text-xs text-muted">
            {event.status === "draft"
              ? "Draft. Only you can see it."
              : "Editing this event keeps its existing link and QR."}
          </span>
        </div>
        {failure && <Alert>{failure}</Alert>}
        {STAGES.map((title, index) => (
          <Card
            key={title}

            className="min-h-[35vh] scroll-mt-28"
          >
            <div
              ref={(section) => {
                sections.current[index] = section;
              }}
              data-stage={index}
              className="scroll-mt-28"
            >
              <h2 tabIndex={-1} className="mb-5 text-xl font-bold">
                {title}
              </h2>
              {index === 0
                ? (basics ?? (
                    <Field
                      label="Event name"
                      error={form.formState.errors.name?.message}
                    >
                      {(props) => (
                        <Input {...props} {...form.register("name")} />
                      )}
                    </Field>
                  ))
                : index === 1
                  ? details
                  : settings}
            </div>
            <div className="mt-6 flex gap-3">
              {index > 0 && (
                <Button variant="secondary" onClick={() => navigate(index - 1)}>
                  Back
                </Button>
              )}
              {index < 2 && (
                <Button onClick={() => navigate(index + 1)}>Next</Button>
              )}
            </div>
          </Card>
        ))}
      </form>
    </FormProvider>
  );
}
