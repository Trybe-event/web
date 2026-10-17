"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Card, Dialog, Field } from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import {
  networkingWindowSchema,
  type NetworkingWindow,
} from "@/lib/event-lifecycle";
import { EventTimeInput } from "./event-fields";
import { EventStatusBadges } from "./event-status-badges";

export function EventLifecycle({ event }: { event: Schemas["Event"] }) {
  const router = useRouter();
  const [current, setCurrent] = useState(event);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const mutationLock = useRef(false);
  const form = useForm<NetworkingWindow>({
    resolver: zodResolver(networkingWindowSchema),
    defaultValues: {
      opens_at: event.networking_opens_at || "",
      closes_at: event.networking_closes_at || "",
    },
  });
  async function mutate(window?: NetworkingWindow) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    setFailure(undefined);
    setNotice(undefined);
    try {
      const result = window
        ? await api.PUT("/events/{eventId}/networking", {
            params: { path: { eventId: current.id } },
            body: window,
            signal: AbortSignal.timeout(15000),
          })
        : await api.POST("/events/{eventId}/status", {
            params: { path: { eventId: current.id } },
            body: { status: "ended" },
            signal: AbortSignal.timeout(15000),
          });
      if (!result.response.ok || !result.data) {
        for (const [name, message] of Object.entries(fieldErrors(result.error)))
          if (name === "opens_at" || name === "closes_at")
            form.setError(name, { message });
        throw new Error(errorMessage(result.error));
      }
      setCurrent(result.data);
      form.reset({
        opens_at: result.data.networking_opens_at || "",
        closes_at: result.data.networking_closes_at || "",
      });
      setConfirmEnd(false);
      setNotice(
        window
          ? "Networking window saved."
          : "Event marked as ended. Networking status is shown separately.",
      );
      router.refresh();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The change could not be saved. Your previous settings remain in place; try again.",
      );
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }
  return (
    <Card className="space-y-5">
      <h2 className="text-xl font-bold">Event lifecycle</h2>
      <EventStatusBadges event={current} />
      <p className="text-sm text-muted">
        Event progress, registration and networking have separate states. Ending
        the program does not by itself describe whether people can make new
        connections. Accepted connections remain available.
      </p>
      {failure && <Alert>{failure}</Alert>}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <form
        onSubmit={(submitEvent) => {
          void form.handleSubmit((window) => mutate(window))(submitEvent);
        }}
      >
        <fieldset disabled={pending} className="space-y-4">
          <legend className="font-bold">Networking window</legend>
          <p className="text-sm text-muted">
            Set both boundaries to define the networking window. Times use{" "}
            {current.timezone || "UTC"}.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["opens_at", "closes_at"] as const).map((name) => (
              <Field
                key={name}
                label={
                  name === "opens_at" ? "Networking opens" : "Networking closes"
                }
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
                        timezone={current.timezone || "UTC"}
                        onChange={field.onChange}
                        onValidationError={(message) =>
                          form.setError(name, { message })
                        }
                      />
                    )}
                  />
                )}
              </Field>
            ))}
          </div>
          <Button type="submit" loading={pending}>
            Save networking window
          </Button>
        </fieldset>
      </form>
      <Button
        variant="danger"
        disabled={pending || current.status !== "published"}
        onClick={() => setConfirmEnd(true)}
      >
        {current.status === "ended" ? "Event ended" : "End event"}
      </Button>
      {current.status === "draft" && (
        <p className="text-sm text-muted">
          Publish this event before marking it as ended.
        </p>
      )}
      <Dialog
        open={confirmEnd}
        onClose={() => {
          if (!pending) setConfirmEnd(false);
        }}
        title="End this event?"
        description="This marks the event as ended. Networking follows its separate window, and accepted connections are retained."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmEnd(false)}
            >
              Keep event open
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => void mutate()}
            >
              Confirm end event
            </Button>
          </>
        }
      />
    </Card>
  );
}
