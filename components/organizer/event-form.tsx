"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import {
  eventSetupSteps,
  publishedEventSetupSteps,
  eventSetupFieldStep as eventFieldStage,
  eventSetupStepErrors as eventStageErrors,
} from "@/lib/event-setup";
import {
  EventRegistrationSettings,
  EventExperienceSettings,
  EventPagePreview,
  EventTicketNotice,
} from "./event-setup-panels";
import { Alert, Button, Card, Field, Input, Skeleton } from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import {
  eventDraftSchema,
  eventDraftValues,
  type EventDraft,
} from "@/lib/event-form";
import { ProgramBuilder } from "./program-builder";
import { EventEditorContext } from "./event-editor-context";

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
  const searchParams = useSearchParams();
  const requestedStep = useRef(searchParams.get("step"));
  const form = useForm<EventDraft>({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {},
  });
  const liveValues = useWatch({ control: form.control }) as EventDraft;
  const [progressFailure, setProgressFailure] = useState<{
    stage: number;
    message: string;
  }>();
  const [advancing, setAdvancing] = useState(false);
  const advancingLock = useRef(false);
  const [event, setEvent] = useState<Schemas["Event"]>();
  const [activeStage, setActiveStage] = useState(0);
  const published = Boolean(event && event.status !== "draft");
  const STAGES = published ? publishedEventSetupSteps : eventSetupSteps;
  const fieldStep = (name: string) => eventFieldStage(name, published);
  const stageErrors = (values: EventDraft, stage: number) =>
    eventStageErrors(values, stage, published);
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
  const [busySections, setBusySections] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const setSectionBusy = useCallback((section: string, busy: boolean) => {
    setBusySections((current) => {
      if (current.has(section) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(section);
      else next.delete(section);
      return next;
    });
  }, []);

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
        setActiveStage(
          requestedStep.current === "experience"
            ? result.data.status === "draft"
              ? 3
              : 4
            : requestedStep.current === "page"
              ? result.data.status === "draft"
                ? 4
                : 7
              : 0,
        );
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
  }, [eventId, organizerId, attempt, form, router, requestedStep]);

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
          if (currentEvent.current.name !== data.name) router.refresh();
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
  function navigate(stage: number) {
    setActiveStage(stage);
    requestAnimationFrame(() => {
      sections.current[stage]?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      sections.current[stage]
        ?.querySelector<HTMLElement>("h2")
        ?.focus({ preventScroll: true });
    });
  }
  function reportErrors(errors: Record<string, string>) {
    for (const [name, message] of Object.entries(errors))
      form.setError(name as FieldPath<EventDraft>, { message });
    const first = Object.keys(errors).sort(
      (left, right) => fieldStep(left) - fieldStep(right),
    )[0];
    if (!first) return;
    const stage = fieldStep(first);
    setProgressFailure({
      stage,
      message:
        errors[first] || "Complete the highlighted fields before continuing.",
    });
    navigate(stage);
    requestAnimationFrame(() => form.setFocus(first as FieldPath<EventDraft>));
  }
  async function advance(stage: number) {
    if (advancingLock.current) return;
    const errors = Object.assign(
      {},
      ...Array.from({ length: stage }, (_, index) =>
        stageErrors(form.getValues(), index),
      ),
    );
    if (Object.keys(errors).length) {
      reportErrors(errors);
      return;
    }
    if (
      stage > 0 &&
      (busySections.has("program") || busySections.has("image"))
    ) {
      const blockedStep = busySections.has("program")
        ? fieldStep("program")
        : 0;
      setProgressFailure({
        stage: blockedStep,
        message:
          "Save or cancel your program edits, and finish loading or uploading, before continuing.",
      });
      navigate(blockedStep);
      return;
    }
    advancingLock.current = true;
    setAdvancing(true);
    try {
      if (!(await save())) {
        setProgressFailure({
          stage: Math.max(0, stage - 1),
          message:
            "Your changes could not be saved. Check the highlighted fields and retry before continuing.",
        });
        return;
      }
      setProgressFailure(undefined);
      navigate(stage);
    } finally {
      advancingLock.current = false;
      setAdvancing(false);
    }
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
    <EventEditorContext
      value={{ event, save, busySections, setSectionBusy, reportErrors }}
    >
      <FormProvider {...form}>
        <div className="organizer-editor-layout">
          <form
            noValidate
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              void save();
            }}
            className="mt-6 min-w-0 space-y-6"
          >
            <fieldset
              disabled={busySections.has("publication")}
              className="min-w-0 space-y-6"
            >
              <nav
                aria-label="Event setup stages"
                className="organizer-setup-stages organizer-wizard-steps"
              >
                {STAGES.map((label, index) => (
                  <Button
                    key={label}
                    variant="secondary"
                    aria-current={activeStage === index ? "step" : undefined}
                    disabled={advancing}
                    onClick={() =>
                      index > activeStage
                        ? void advance(index)
                        : navigate(index)
                    }
                  >
                    {!published && (
                      <span className="organizer-step-number">{index + 1}</span>
                    )}{" "}
                    {label}
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

                  className="organizer-setup-panel"
                  hidden={activeStage !== index}
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
                    {progressFailure?.stage === index && (
                      <Alert>{progressFailure.message}</Alert>
                    )}
                    {title === "Event details" ? (
                      <div className="space-y-6">
                        {basics ?? (
                          <Field
                            label="Event name"
                            error={form.formState.errors.name?.message}
                          >
                            {(props) => (
                              <Input {...props} {...form.register("name")} />
                            )}
                          </Field>
                        )}
                        {details}
                      </div>
                    ) : title === "Tickets" ? (
                      <EventTicketNotice />
                    ) : title === "Registration" ? (
                      <EventRegistrationSettings />
                    ) : title === "Experience" ? (
                      <EventExperienceSettings includeProgram={!published} />
                    ) : title === "Agenda & lineup" ? (
                      <ProgramBuilder />
                    ) : title === "Sponsors" || title === "Polls" ? (
                      <div className="organizer-upcoming-feature">
                        <div>
                          <strong>{title} are being built</strong>
                          <p>This feature is not active in the trial.</p>
                        </div>
                      </div>
                    ) : title === "Page" ? (
                      <EventPagePreview event={event} values={liveValues} />
                    ) : (
                      settings
                    )}
                  </div>
                  <div className="mt-6 flex gap-3">
                    {index > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(index - 1)}
                      >
                        Back
                      </Button>
                    )}
                    {index < STAGES.length - 1 && (
                      <Button
                        loading={advancing}
                        disabled={
                          Object.keys(stageErrors(liveValues, index)).length >
                            0 ||
                          busySections.has("program") ||
                          busySections.has("image")
                        }
                        onClick={() => void advance(index + 1)}
                      >
                        Save and continue
                      </Button>
                    )}
                  </div>
                  {index < STAGES.length - 1 &&
                    Object.keys(stageErrors(liveValues, index)).length > 0 && (
                      <p className="mt-2 text-sm text-muted">
                        Complete the required fields in this section to
                        continue.
                      </p>
                    )}
                  {(busySections.has("program") ||
                    busySections.has("image")) && (
                    <p className="mt-2 text-sm text-muted">
                      Save or cancel open program edits, and wait for the
                      program or image upload to finish before continuing.
                    </p>
                  )}
                </Card>
              ))}
            </fieldset>
          </form>
          <aside className="organizer-event-preview" aria-label="Event preview">
            <div className="organizer-event-preview-image">
              {event.image_url ? (
                <Image
                  src={event.image_url}
                  alt="Your event cover"
                  width={600}
                  height={800}
                  unoptimized
                  className="h-auto w-full object-contain"
                />
              ) : (
                <span>Your event cover</span>
              )}
            </div>
            <div className="p-4">
              <span className="text-xs text-muted">
                {event.status === "draft"
                  ? "Draft"
                  : event.status === "published"
                    ? "Published"
                    : "Ended"}
              </span>
              <h2 className="mt-2 text-base font-semibold">
                {liveValues.name || "Your event"}
              </h2>
              <p className="mt-2 text-xs text-muted">
                {liveValues.venue_name ||
                  (liveValues.format === "virtual"
                    ? "Virtual event"
                    : "Add a venue to your event")}
              </p>
              <p className="mt-5 text-xs text-muted">
                Publish your event to share its registration page.
              </p>
            </div>
          </aside>
        </div>
      </FormProvider>
    </EventEditorContext>
  );
}
