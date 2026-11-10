"use client";
import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  TagInput,
  Textarea,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";
import type { EventDraft } from "@/lib/event-form";
import { eventTimeToISO, localEventTime } from "@/lib/event-time";
import { useEventEditor } from "./event-editor-context";

export function EventTimeInput({
  value,
  onChange,
  timezone,
  onValidationError,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value?: string | null;
  onChange: (value: string) => void;
  timezone: string;
  onValidationError?: (message: string) => void;
}) {
  const [error, setError] = useState<string>();
  let displayValue = "";
  try {
    displayValue = value ? localEventTime(value, timezone) : "";
  } catch {
    /* The timezone field reports invalid IANA names. */
  }
  return (
    <>
      <Input
        {...props}
        type="datetime-local"
        value={displayValue}
        onChange={(change) => {
          try {
            onChange(
              change.target.value
                ? eventTimeToISO(change.target.value, timezone)
                : "",
            );
            setError(undefined);
          } catch (failure) {
            const message =
              failure instanceof Error
                ? failure.message
                : "Choose another time.";
            setError(message);
            onValidationError?.(message);
          }
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
export function DraftTimeField({
  name,
  label,
  optional,
}: {
  name:
    | "starts_at"
    | "ends_at"
    | "registration_opens_at"
    | "registration_closes_at"
    | "networking_opens_at"
    | "networking_closes_at";
  label: string;
  optional?: boolean;
}) {
  const form = useFormContext<EventDraft>();
  const { event } = useEventEditor();
  const timezone =
    useWatch({ control: form.control, name: "timezone" }) || "UTC";
  return (
    <Field
      label={label}
      optional={optional}
      hint={`Shown in ${timezone}.`}
      error={form.formState.errors[name]?.message}
    >
      {(props) => (
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <EventTimeInput
              {...props}
              value={field.value}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              required={!optional}
              timezone={timezone}
              onValidationError={(message) => form.setError(name, { message })}
              onChange={(value) =>
                field.onChange(
                  value ||
                    (name === "starts_at" || name === "ends_at"
                      ? event[name]
                        ? ""
                        : undefined
                      : null),
                )
              }
            />
          )}
        />
      )}
    </Field>
  );
}
function TextField({
  name,
  label,
  maxLength,
  optional,
}: {
  name: "name" | "summary" | "venue_name" | "venue_address" | "attendance_url";
  label: string;
  maxLength?: number;
  optional?: boolean;
}) {
  const form = useFormContext<EventDraft>();
  return (
    <Field
      label={label}
      optional={optional}
      error={form.formState.errors[name]?.message}
    >
      {(props) => (
        <Input
          {...props}
          required={!optional}
          maxLength={maxLength}
          {...form.register(name)}
        />
      )}
    </Field>
  );
}
export function EventBasics() {
  const form = useFormContext<EventDraft>();
  const { event } = useEventEditor();
  const format = useWatch({ control: form.control, name: "format" });
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <TextField name="name" label="Event name" maxLength={160} />
      <Field label="Event format" error={form.formState.errors.format?.message}>
        {(props) => (
          <Select
            required
            {...props}
            {...form.register("format", {
              setValueAs: (value: string) =>
                value || (event.format ? "" : undefined),
            })}
          >
            <option value="">Choose format</option>
            <option value="physical">In person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        )}
      </Field>
      <Field
        label="Timezone"
        hint="Choose an IANA timezone. Existing dates keep the same instant when the timezone changes."
        error={form.formState.errors.timezone?.message}
      >
        {(props) => (
          <>
            <Input
              required
              {...props}
              list="event-timezones"
              placeholder="Africa/Lagos"
              {...form.register("timezone", {
                setValueAs: (value: string) =>
                  value || (event.timezone ? "" : undefined),
              })}
            />
            <datalist id="event-timezones">
              {["UTC", ...Intl.supportedValuesOf("timeZone")].map(
                (timezone) => (
                  <option key={timezone} value={timezone} />
                ),
              )}
            </datalist>
          </>
        )}
      </Field>
      <DraftTimeField name="starts_at" label="Event starts" />
      <DraftTimeField name="ends_at" label="Event ends" />
      {(format === "physical" || format === "hybrid") && (
        <>
          <TextField name="venue_name" label="Venue name" maxLength={200} />
          <TextField
            name="venue_address"
            label="Venue address"
            maxLength={500}
          />
        </>
      )}
      {(format === "virtual" || format === "hybrid") && (
        <TextField
          name="attendance_url"
          label="External attendance link"
          maxLength={500}
        />
      )}
    </div>
  );
}
export function EventDetails() {
  const form = useFormContext<EventDraft>();
  const { setSectionBusy } = useEventEditor();
  const [uploadStatus, setUploadStatus] = useState<string>();
  const [uploadFailure, setUploadFailure] = useState<string>();
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    setSectionBusy("image", uploading);
    return () => setSectionBusy("image", false);
  }, [uploading, setSectionBusy]);
  async function upload(file: File) {
    setUploadFailure(undefined);
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setUploadFailure("Choose a JPEG, PNG or WebP image up to 5 MB.");
      return;
    }
    setUploading(true);
    setUploadStatus("Uploading event image...");
    try {
      const { data, error } = await api.POST("/uploads", {
        body: {
          purpose: "event_image",
          content_type: file.type as "image/jpeg" | "image/png" | "image/webp",
          size: file.size,
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!data) throw new Error(errorMessage(error));
      const response = await fetch(data.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok)
        throw new Error("Image upload failed. Choose the file again to retry.");
      form.setValue("image_key", data.key, { shouldDirty: true });
      setUploadStatus("Image uploaded. Your draft will save it automatically.");
    } catch (error) {
      setUploadFailure(
        error instanceof Error ? error.message : "Image upload failed.",
      );
      setUploadStatus(undefined);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-5">
      <TextField name="summary" label="Short summary" maxLength={280} />
      <Field
        label="About the event"
        error={form.formState.errors.description?.message}
      >
        {(props) => (
          <Textarea
            required
            {...props}
            maxLength={10000}
            {...form.register("description")}
          />
        )}
      </Field>
      <Field
        label="Topics"
        optional
        hint="Press comma or Enter to add a topic."
        error={form.formState.errors.topics?.message}
      >
        {(props) => (
          <Controller
            control={form.control}
            name="topics"
            render={({ field }) => (
              <TagInput
                {...props}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </Field>
      <Field
        label="Event image"
        optional
        hint="Recommended: 1080 × 1440 pixels (3:4 portrait). JPEG, PNG or WebP, up to 5 MB. Your full image stays visible at its original proportions, with rounded edges and no cropping."
      >
        {(props) => (
          <Input
            {...props}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(change) => {
              const file = change.target.files?.[0];
              change.target.value = "";
              if (file) void upload(file);
            }}
          />
        )}
      </Field>
      {uploadStatus && (
        <p role="status" className="text-sm text-muted">
          {uploadStatus}
        </p>
      )}
      {uploadFailure && <Alert>{uploadFailure}</Alert>}
      <Button
        variant="secondary"
        disabled={uploading}
        onClick={() => {
          form.setValue("image_key", null, { shouldDirty: true });
          setUploadStatus("Event image removed.");
        }}
      >
        Remove event image
      </Button>
    </div>
  );
}
