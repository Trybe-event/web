"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Field, Textarea } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import { connectionAction } from "@/lib/connection-action";

export function ConnectAttendee({
  profile,
  eventId,
  networking,
}: {
  profile: Schemas["Profile"];
  eventId: string;
  networking: Schemas["WindowState"];
}) {
  const router = useRouter();
  const [relationship, setRelationship] = useState(profile.relationship);
  const [requestId, setRequestId] = useState<string>();
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<string>();
  const [pending, setPending] = useState(false);
  const requestLock = useRef(false);
  const action = connectionAction({ ...profile, relationship }, networking);
  async function perform(operation: "send" | "accept" | "reject" | "cancel") {
    if (requestLock.current) return;
    if (
      (operation === "send" && action.kind !== "request") ||
      (operation === "accept" && networking !== "open")
    )
      return;
    requestLock.current = true;
    setPending(true);
    setFailure(undefined);
    try {
      if (operation === "send") {
        const result = await api.POST("/connection-requests", {
          body: {
            event_id: eventId,
            recipient_id: profile.attendee_id,
            ...(message.trim() ? { message: message.trim() } : {}),
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!result.response.ok || !result.data) {
          if (result.response.status === 409) router.refresh();
          throw new Error(errorMessage(result.error));
        }
        setRequestId(result.data.id);
        setRelationship(
          result.data.status === "accepted" ? "connected" : "pending_outgoing",
        );
      } else {
        let currentRequestId = requestId;
        if (!currentRequestId) {
          const requests = await api.GET("/me/connection-requests", {
            params: {
              query: {
                direction: operation === "cancel" ? "outgoing" : "incoming",
              },
            },
            signal: AbortSignal.timeout(15000),
          });
          if (!requests.response.ok || !requests.data)
            throw new Error(errorMessage(requests.error));
          currentRequestId = requests.data.items.find(
            (request) =>
              request.other.attendee_id === profile.attendee_id &&
              request.status === "pending",
          )?.id;
        }
        if (!currentRequestId) {
          router.refresh();
          throw new Error(
            "The request changed. Refresh this profile to see its latest status.",
          );
        }
        const result = await api.POST(
          "/connection-requests/{requestId}/{action}",
          {
            params: {
              path: { requestId: currentRequestId, action: operation },
            },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!result.response.ok || !result.data) {
          router.refresh();
          throw new Error(errorMessage(result.error));
        }
        setRelationship(
          result.data.status === "accepted" ? "connected" : "none",
        );
        setRequestId(undefined);
      }
      router.refresh();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "The request could not be completed. Try again.",
      );
    } finally {
      setPending(false);
      requestLock.current = false;
    }
  }
  return (
    <div className="space-y-3" aria-label="Connection actions">
      {failure && <Alert>{failure}</Alert>}
      {action.kind === "request" && (
        <>
          <Field
            label="A short introduction"
            optional
            hint="Up to 300 characters."
          >
            {(props) => (
              <Textarea
                {...props}
                maxLength={300}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={pending}
              />
            )}
          </Field>
          <Button loading={pending} onClick={() => void perform("send")}>
            {action.label}
          </Button>
          <p className="text-sm text-muted">
            They choose whether to accept. Contact details are shared only
            according to each person&apos;s visibility settings.
          </p>
        </>
      )}
      {action.kind === "outgoing" && (
        <>
          <Badge>{action.label}</Badge>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => void perform("cancel")}
          >
            Cancel request
          </Button>
        </>
      )}
      {action.kind === "incoming" && (
        <>
          <p>{action.label}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              loading={pending}
              disabled={networking !== "open"}
              onClick={() => void perform("accept")}
            >
              Accept request
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void perform("reject")}
            >
              Decline
            </Button>
          </div>
          {networking !== "open" && (
            <p className="text-sm text-muted">
              New connections are unavailable while networking is closed.
            </p>
          )}
        </>
      )}
      {(action.kind === "unavailable" ||
        action.kind === "self" ||
        action.kind === "connected") && (
        <>
          <Button disabled variant="secondary">
            {action.label}
          </Button>
          {action.kind === "unavailable" && (
            <p className="text-sm text-muted">{action.label}</p>
          )}
          {action.kind === "connected" && (
            <p className="text-sm text-muted">
              Your accepted connection remains available even after this
              event&apos;s networking closes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
