"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Dialog,
  Field,
  Select,
  Textarea,
} from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import {
  REPORT_ACTIONS,
  reportActionSchema,
  type ReportAction,
} from "@/lib/admin-reports";

export function ReportActions({
  reportId,
  reportStatus,
}: {
  reportId: string;
  reportStatus: Schemas["Report"]["status"];
}) {
  const router = useRouter();
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preparedAction, setPreparedAction] = useState<{
    action: ReportAction;
    reason: string;
  } | null>(null);
  const [isPending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const pending = useRef(false);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || needsReview) return;
    const result = reportActionSchema.safeParse({ action, reason });
    setFailure("");
    setSuccess("");
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    setPreparedAction(result.data);
  }

  async function confirmAction() {
    if (pending.current || needsReview || !preparedAction) return;
    const confirmed = preparedAction;
    pending.current = true;
    setPending(true);
    setFailure("");
    try {
      const result = await api.POST("/admin/reports/{reportId}/actions", {
        params: { path: { reportId } },
        body: confirmed,
      });
      if (!result.response.ok || !result.data) {
        setErrors(fieldErrors(result.error));
        setFailure(
          errorMessage(
            result.error,
            "The action could not be confirmed. Review the report before trying again.",
          ),
        );
        setPreparedAction(null);
        if (result.response.status >= 500) setNeedsReview(true);
        if (result.response.status === 409) router.refresh();
        return;
      }
      setPreparedAction(null);
      setAction("");
      setReason("");
      setSuccess("Moderation action recorded.");
      router.refresh();
    } catch {
      // A timed-out response may follow a committed action. Do not auto-resubmit.
      setFailure(
        "The action could not be confirmed. Reload the report and check its status before submitting again.",
      );
      setPreparedAction(null);
      setNeedsReview(true);
    } finally {
      pending.current = false;
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-xl font-bold">Moderation action</h2>
      <p className="text-sm text-muted">
        Actions apply to the reported attendee and are recorded with your
        administrator identity. Warnings are recorded only; email delivery is
        not included.
      </p>
      {success && <Alert tone="success">{success}</Alert>}
      {needsReview && (
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload report before another action
        </Button>
      )}
      {failure && !preparedAction && <Alert>{failure}</Alert>}
      <form onSubmit={prepare} className="space-y-4">
        <Field label="Action" error={errors.action}>
          {(control) => (
            <Select
              {...control}
              value={action}
              disabled={isPending || needsReview}
              required
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">Choose an action</option>
              {(
                Object.entries(REPORT_ACTIONS) as [
                  ReportAction,
                  (typeof REPORT_ACTIONS)[ReportAction],
                ][]
              ).map(([value, choice]) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === "dismiss" && reportStatus === "actioned"}
                >
                  {choice.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Reason for this action"
          hint="Required. Up to 1,000 characters. This becomes part of the moderation audit."
          error={errors.reason}
        >
          {(control) => (
            <Textarea
              {...control}
              value={reason}
              required
              maxLength={1000}
              disabled={isPending || needsReview}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={isPending || needsReview}>
          Review action
        </Button>
      </form>
      <Dialog
        open={preparedAction !== null}
        onClose={() => setPreparedAction(null)}
        title={
          preparedAction
            ? REPORT_ACTIONS[preparedAction.action].label
            : "Confirm action"
        }
        description={
          preparedAction
            ? REPORT_ACTIONS[preparedAction.action].consequence
            : undefined
        }
        actions={
          <>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => setPreparedAction(null)}
            >
              Cancel
            </Button>
            <Button loading={isPending} onClick={confirmAction}>
              Confirm action
            </Button>
          </>
        }
      >
        <p className="whitespace-pre-wrap break-words">
          {preparedAction?.reason}
        </p>
        {failure && <Alert>{failure}</Alert>}
      </Dialog>
    </Card>
  );
}
