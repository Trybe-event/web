"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormContext } from "react-hook-form";
import { Alert, Button, Card, Field, Select } from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import { eventDraftValues, type EventDraft } from "@/lib/event-form";
import {
  createPublicationLock,
  publicationErrors,
} from "@/lib/event-publication";
import { localEventTime } from "@/lib/event-time";
import { useEventEditor } from "./event-editor-context";
import { DraftTimeField } from "./event-fields";
import { RegistrationPolicyFields } from "./event-setup-panels";

type Review = { event: Schemas["Event"]; program: Schemas["Program"] };
const labels: Record<keyof EventDraft, string> = {
  name: "Event name",
  format: "Format",
  timezone: "Timezone",
  starts_at: "Starts",
  ends_at: "Ends",
  venue_name: "Venue",
  venue_address: "Address",
  attendance_url: "Attendance link",
  summary: "Summary",
  description: "Description",
  topics: "Topics",
  image_key: "Event image",
  visibility: "Visibility",
  registration_opens_at: "Registration opens",
  registration_closes_at: "Registration closes",
  networking_opens_at: "Networking opens",
  networking_closes_at: "Networking closes",
  category: "Category",
  approval_mode: "Registration approval",
  capacity: "Capacity",
  waitlist_enabled: "Waitlist when full",
};

function reviewedValue(name: keyof EventDraft, event: Schemas["Event"]) {
  const value = event[name];
  if (name === "image_key") return value ? "Image uploaded" : "No image";
  if (name.endsWith("_at") && value)
    return `${localEventTime(String(value), event.timezone || "UTC").replace("T", " ")} (${event.timezone || "UTC"})`;
  if (Array.isArray(value)) return value.join(", ") || "None";
  if (name === "capacity" && value == null) return "No limit";
  if (name === "waitlist_enabled") return value ? "On" : "Off";
  if (name === "approval_mode")
    return value === "review" ? "Review each registration" : "Automatic";
  return value == null || value === "" ? "Not set" : String(value);
}

export function EventSettings({
  reviewOnly = false,
}: {
  reviewOnly?: boolean;
}) {
  const form = useFormContext<EventDraft>();
  const { event, save, busySections, setSectionBusy, reportErrors } =
    useEventEditor();
  const router = useRouter();
  const [review, setReview] = useState<Review>();
  const [failure, setFailure] = useState<string>();
  const [pending, setPending] = useState(false);
  const [publishedEvent, setPublishedEvent] = useState<Schemas["Event"]>();
  const requestLock = useRef(createPublicationLock());
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!review) return;
    reviewHeading.current?.focus({ preventScroll: true });
    reviewHeading.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [review]);
  const hasUnfinishedEdits = [...busySections].some(
    (section) => section !== "publication",
  );

  function showErrors(errors: Record<string, string>) {
    reportErrors(errors);
  }
  async function loadReview(): Promise<Review> {
    const localErrors = publicationErrors(form.getValues());
    if (Object.keys(localErrors).length) {
      showErrors(localErrors);
      throw new Error(
        "Complete the highlighted event details before continuing to review.",
      );
    }
    if (!(await save()))
      throw new Error(
        "Fix the highlighted fields and save your changes, then review again.",
      );
    const [eventResponse, programResponse] = await Promise.all([
      api.GET("/events/{eventId}", {
        params: { path: { eventId: event.id } },
        signal: AbortSignal.timeout(15000),
      }),
      api.GET("/events/{eventId}/program", {
        params: { path: { eventId: event.id } },
        signal: AbortSignal.timeout(15000),
      }),
    ]);
    if (!eventResponse.data || !eventResponse.response.ok)
      throw new Error(errorMessage(eventResponse.error));
    if (!programResponse.data || !programResponse.response.ok)
      throw new Error(errorMessage(programResponse.error));
    const errors = publicationErrors(eventDraftValues(eventResponse.data));
    if (Object.keys(errors).length) {
      showErrors(errors);
      throw new Error(
        "Complete the highlighted event details before reviewing for publication.",
      );
    }
    return { event: eventResponse.data, program: programResponse.data };
  }
  async function perform(publish: boolean) {
    if (hasUnfinishedEdits) return;
    return requestLock.current(async () => {
      setPending(true);
      setSectionBusy("publication", true);
      setFailure(undefined);
      try {
        const latest = await loadReview();
        const changed =
          !review ||
          JSON.stringify([eventDraftValues(latest.event), latest.program]) !==
            JSON.stringify([eventDraftValues(review.event), review.program]);
        setReview(latest);
        if (!publish) return;
        if (changed)
          throw new Error(
            "Your saved details or program changed. Read the updated review, then confirm again.",
          );
        const result = await api.POST("/events/{eventId}/publish", {
          params: { path: { eventId: event.id } },
          signal: AbortSignal.timeout(15000),
        });
        if (!result.data || !result.response.ok) {
          showErrors(fieldErrors(result.error));
          throw new Error(errorMessage(result.error));
        }
        setPublishedEvent(result.data);
        router.replace(
          `/organizer/events/${encodeURIComponent(result.data.id)}`,
        );
        router.refresh();
      } catch (error) {
        setFailure(
          error instanceof Error
            ? error.message
            : "We couldn't publish. Your draft is still saved; try again.",
        );
      } finally {
        setPending(false);
        setSectionBusy("publication", false);
      }
    });
  }
  return (
    <div className="space-y-5">
      {!reviewOnly && (
        <>
          {" "}
          <Field
            label="Event visibility"
            error={form.formState.errors.visibility?.message}
          >
            {(props) => (
              <Select {...props} required {...form.register("visibility")}>
                <option value="">Choose visibility</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </Select>
            )}
          </Field>
          <p className="text-sm text-muted">
            Public events can appear in discovery and recommendations. Private
            events stay out of public discovery. Anyone with a private
            registration link can forward it; the link is not an invitation-only
            access control.
          </p>
          <RegistrationPolicyFields />
          <div className="grid gap-5 md:grid-cols-2">
            <DraftTimeField
              name="registration_opens_at"
              label="Registration opens"
              optional
            />
            <DraftTimeField
              name="registration_closes_at"
              label="Registration closes"
              optional
            />
            <DraftTimeField
              name="networking_opens_at"
              label="Networking opens"
              optional
            />
            <DraftTimeField
              name="networking_closes_at"
              label="Networking closes"
              optional
            />
          </div>
          <p className="text-sm text-muted">
            Leave a window boundary empty to leave that boundary unrestricted.
            All times use your event timezone. Existing connections remain
            available when new networking closes.
          </p>
        </>
      )}
      {hasUnfinishedEdits && (
        <p role="status">
          Finish or cancel your program edits and wait for image uploads before
          reviewing.
        </p>
      )}
      {failure && <Alert>{failure}</Alert>}
      <Button
        variant="secondary"
        loading={pending}
        disabled={hasUnfinishedEdits}
        onClick={() => void perform(false)}
      >
        Continue to review
      </Button>
      {review && (
        <Card className="space-y-5" aria-label="Saved event review">
          <span className="eyebrow">FINAL STEP</span>
          <h3
            ref={reviewHeading}
            tabIndex={-1}
            className="scroll-mt-28 text-xl font-bold"
          >
            Review and publish your event
          </h3>
          <p className="text-sm text-muted">
            These are your saved details. Confirmation checks for changes before
            publishing this same event.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof EventDraft)[]).map((name) => (
              <div key={name} className="min-w-0">
                <dt className="text-sm font-semibold">{labels[name]}</dt>
                <dd className="whitespace-pre-wrap break-words text-sm text-muted">
                  {reviewedValue(name, review.event)}
                </dd>
              </div>
            ))}
          </dl>
          <h4 className="font-bold">Program</h4>
          {!review.program.days.length && <p>No program days added.</p>}
          {review.program.days.map((day) => (
            <section
              key={day.id}
              className="space-y-3 border-t border-line pt-3"
            >
              <h5 className="font-semibold">
                {day.date}
                {day.title ? `: ${day.title}` : ""}
              </h5>
              {!day.sessions.length && <p>No sessions added.</p>}
              {day.sessions.map((session) => (
                <div key={session.id} className="space-y-1 break-words text-sm">
                  <strong>{session.title}</strong>
                  <p>
                    {localEventTime(
                      session.starts_at,
                      review.event.timezone || "UTC",
                    ).replace("T", " ")}{" "}
                    to{" "}
                    {localEventTime(
                      session.ends_at,
                      review.event.timezone || "UTC",
                    ).replace("T", " ")}
                  </p>
                  <p>{session.description}</p>
                  <p>
                    {[session.room, session.track].filter(Boolean).join(" · ")}
                  </p>
                  {Boolean(session.overlaps_with?.length) && (
                    <p>Runs alongside another session.</p>
                  )}
                  {session.speakers?.map((speaker, index) => (
                    <div key={index}>
                      <strong>{speaker.name}</strong>
                      <p>
                        {[speaker.role, speaker.organization]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p>{speaker.bio}</p>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
          <Button
            loading={pending}
            disabled={
              hasUnfinishedEdits ||
              review.event.status === "ended" ||
              Boolean(publishedEvent)
            }
            onClick={() => void perform(true)}
          >
            {review.event.status === "draft"
              ? "Publish event and get your link"
              : "Confirm and open event management"}
          </Button>
          {publishedEvent && (
            <div
              role="status"
              className="space-y-2 rounded-lg border border-line p-4"
            >
              <strong>Your event is published.</strong>
              <p className="text-sm">
                Opening your event overview. Your registration link and QR code
                are ready under Reach.
              </p>
              {publishedEvent.registration_url && (
                <p className="break-all text-sm">
                  {publishedEvent.registration_url}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
