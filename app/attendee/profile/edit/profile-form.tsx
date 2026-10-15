"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useFieldArray,
  Controller,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { z } from "zod";

import {
  Alert,
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
  TagInput,
  useToast,
} from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";
import {
  MAX_PROFILE_PHOTO_SOURCE_BYTES,
  PROFILE_PHOTO_TYPES,
  optimizeProfilePhoto,
} from "@/lib/profile-photo";

import { LINK_LABELS, VISIBILITY_HINTS, VISIBILITY_LABELS } from "../labels";

const LINK_KINDS = Object.keys(LINK_LABELS) as Schemas["LinkKind"][];
const VISIBILITIES = Object.keys(VISIBILITY_LABELS) as Schemas["Visibility"][];
const MAX_PHOTO_BYTES = MAX_PROFILE_PHOTO_SOURCE_BYTES;
const PHOTO_TYPES = PROFILE_PHOTO_TYPES;

const tagList = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(40, "Each tag must be 40 characters or fewer."),
  )
  .max(20, "Add up to 20 tags.");

const schema = z
  .object({
    full_name: z.string().trim().min(1, "Required.").max(120, "Too long."),
    role: z.string().trim().min(1, "Required.").max(120, "Too long."),
    bio: z.string().trim().min(1, "Required.").max(1000, "Too long."),
    organization: z.string().trim().max(160, "Too long."),
    goals: z.string().trim().max(500, "Too long."),
    skills: tagList,
    interests: tagList,
    links: z
      .array(
        z.object({
          kind: z.enum(
            LINK_KINDS as [Schemas["LinkKind"], ...Schemas["LinkKind"][]],
          ),
          value: z.string().trim().min(1, "Required.").max(300, "Too long."),
          visibility: z.enum(
            VISIBILITIES as [Schemas["Visibility"], ...Schemas["Visibility"][]],
          ),
        }),
      )
      .max(10, "Add up to 10 links."),
  })
  .refine((v) => v.skills.length + v.interests.length > 0, {
    message: "Add at least one skill or interest so people can find you.",
    path: ["skills"],
  });

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function ProfileForm({
  onboarding,
  fallbackName,
}: {
  onboarding: boolean;
  fallbackName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{
    key: string | null;
    url: string | null;
  }>({ key: null, url: null });
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoUploading, setPhotoUploading] = useState(false);
  const [hasUnsavedPhoto, setUnsavedPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const photoPreviewUrl = useRef<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const uploadInProgress = useRef(false);
  const invalidTagFields = useRef(new Set<"skills" | "interests">());

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: fallbackName,
      role: "",
      bio: "",
      organization: "",
      goals: "",
      skills: [],
      interests: [],
      links: [],
    },
  });
  const links = useFieldArray({ control: form.control, name: "links" });
  const watchedName = useWatch({ control: form.control, name: "full_name" });
  const watchedLinks = useWatch({ control: form.control, name: "links" });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    api
      .GET("/me/profile")
      .then(({ data, response, error }) => {
        if (data) {
          form.reset({
            full_name: data.full_name,
            role: data.role,
            bio: data.bio,
            organization: data.organization ?? "",
            goals: data.goals ?? "",
            skills: data.skills,
            interests: data.interests,
            links: data.links,
          });
          setPhoto({
            key: data.photo_key ?? null,
            url: data.photo_url ?? null,
          });
        } else if (response.status !== 404) {
          setFailure(errorMessage(error));
        }
        setLoaded(true);
      })
      .catch(() => {
        setFailure("We couldn't load your profile. Refresh to try again.");
        setLoaded(true);
      });
  }, [form]);

  useEffect(
    () => () => {
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
    },
    [],
  );

  async function uploadPhoto(file: File) {
    if (uploadInProgress.current) return;
    setPhotoStatus(null);
    setPhotoError(null);
    if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number]))
      return setPhotoError(
        "Choose a JPEG, PNG or WebP image. Export HEIC photos as JPEG first.",
      );
    if (file.size === 0 || file.size > MAX_PHOTO_BYTES)
      return setPhotoError("Choose a photo between 1 byte and 20 MB.");
    if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrl.current = previewUrl;
    setPhoto({ key: null, url: previewUrl });
    setSelectedPhoto(file);
    setUnsavedPhoto(true);
    uploadInProgress.current = true;
    setPhotoUploading(true);
    setPhotoStatus("Optimizing your photo...");
    try {
      const optimizedPhoto = await optimizeProfilePhoto(file);
      setPhotoStatus("Uploading your optimized photo...");
      const { data, error } = await api.POST("/uploads", {
        signal: AbortSignal.timeout(15000),
        body: {
          purpose: "avatar",
          content_type: optimizedPhoto.type as (typeof PHOTO_TYPES)[number],
          size: optimizedPhoto.size,
        },
      });
      if (!data)
        throw new Error(
          errorMessage(error, "Photo upload isn't available right now."),
        );
      const put = await fetch(data.upload_url, {
        method: "PUT",
        body: optimizedPhoto,
        headers: { "Content-Type": optimizedPhoto.type },
        signal: AbortSignal.timeout(60000),
      });
      if (!put.ok) throw new Error("The upload didn't finish. Try again.");
      setPhoto({ key: data.key, url: previewUrl });
      setUnsavedPhoto(false);
      setPhotoError(null);
      setPhotoStatus(
        `Photo ready (${Math.ceil(optimizedPhoto.size / 1024)} KB). Save your profile to keep it.`,
      );
    } catch (error) {
      setPhotoStatus("Preview only. This photo has not been uploaded.");
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Photo upload failed. Try again.",
      );
    } finally {
      uploadInProgress.current = false;
      setPhotoUploading(false);
    }
  }

  async function onSubmit(v: FormOut) {
    setFailure(null);
    const invalidTagField = invalidTagFields.current.values().next().value;
    if (invalidTagField) {
      form.setFocus(invalidTagField);
      return;
    }
    if (uploadInProgress.current || hasUnsavedPhoto || !photo.key) {
      setPhotoError(
        uploadInProgress.current
          ? "Wait for the photo to finish uploading."
          : "Upload a profile photo before saving.",
      );
      photoInput.current?.focus();
      return;
    }
    try {
      const { error, response } = await api.PUT("/me/profile", {
        body: {
          full_name: v.full_name,
          role: v.role,
          bio: v.bio,
          organization: v.organization || null,
          goals: v.goals || null,
          photo_key: photo.key,
          skills: v.skills,
          interests: v.interests,
          links: v.links,
        },
      });
      if (response.ok) {
        toast("Profile saved");
        router.push(
          onboarding
            ? "/attendee/profile/preview?onboarding=1"
            : "/attendee/profile",
        );
        router.refresh();
        return;
      }
      if (response.status === 400) {
        for (const [name, message] of Object.entries(fieldErrors(error)))
          if (name === "photo_key") setPhotoError(message);
          else form.setError(name as FieldPath<FormIn>, { message });
        setFailure("Some fields need attention.");
        return;
      }
      setFailure(errorMessage(error));
    } catch {
      setFailure(
        "We couldn't save your profile. Your details are still here. Try again.",
      );
    }
  }

  if (!loaded) return <Skeleton className="mt-8 h-96" />;

  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
      noValidate
      className="mt-8 flex flex-col gap-8"
    >
      {failure && <Alert>{failure}</Alert>}

      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-bold">About you</h2>
        <p className="text-sm text-muted">
          Your name, photo, role, organization and bio are shown to people who
          share an event with you.
        </p>
        <div className="flex items-center gap-4">
          <Avatar name={watchedName || "?"} src={photo.url} size={64} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor="photo" className="text-sm font-semibold">
              Profile photo{" "}
              <span className="font-normal text-muted">(required)</span>
            </label>
            <Input
              id="photo"
              ref={photoInput}
              type="file"
              accept={PHOTO_TYPES.join(",")}
              required={!photo.key}
              disabled={isPhotoUploading || isSubmitting}
              aria-invalid={Boolean(photoError)}
              aria-describedby={
                photoError ? "photo-status photo-error" : "photo-status"
              }
              onChange={(e) =>
                e.target.files?.[0] && uploadPhoto(e.target.files[0])
              }
              className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-2 file:font-semibold"
            />
            <p id="photo-status" role="status" className="text-sm text-muted">
              {photoStatus ??
                "JPEG, PNG or WebP, up to 20 MB. Automatically optimized to 200 KB or less."}
            </p>
            {photoError && (
              <p id="photo-error" role="alert" className="text-sm text-danger">
                {photoError}
              </p>
            )}
            {selectedPhoto && hasUnsavedPhoto && !isPhotoUploading && (
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => uploadPhoto(selectedPhoto)}
              >
                Retry upload
              </Button>
            )}
          </div>
        </div>
        <Field label="Full name" error={errors.full_name?.message}>
          {(p) => (
            <Input {...p} autoComplete="name" {...form.register("full_name")} />
          )}
        </Field>
        <Field
          label="Professional role"
          hint="For example: Frontend engineer, Product designer, Founder"
          error={errors.role?.message}
        >
          {(p) => (
            <Input
              {...p}
              autoComplete="organization-title"
              {...form.register("role")}
            />
          )}
        </Field>
        <Field
          label="Organization"
          optional
          error={errors.organization?.message}
        >
          {(p) => (
            <Input
              {...p}
              autoComplete="organization"
              {...form.register("organization")}
            />
          )}
        </Field>
        <Field
          label="About you"
          hint="What you do and what you're working on."
          error={errors.bio?.message}
        >
          {(p) => <Textarea {...p} {...form.register("bio")} />}
        </Field>
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-bold">Help the right people find you</h2>
        <Field
          label="Skills"
          hint="Type a skill, then press comma or Enter."
          error={errors.skills?.message}
        >
          {(props) => (
            <Controller
              name="skills"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  {...props}
                  {...field}
                  aria-label="Skills"
                  placeholder="For example: React"
                  disabled={isSubmitting}
                  onValidityChange={(valid) => {
                    if (valid) invalidTagFields.current.delete("skills");
                    else invalidTagFields.current.add("skills");
                  }}
                />
              )}
            />
          )}
        </Field>
        <Field
          label="Interests"
          hint="Type an interest, then press comma or Enter."
          error={errors.interests?.message}
        >
          {(props) => (
            <Controller
              name="interests"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  {...props}
                  {...field}
                  aria-label="Interests"
                  placeholder="For example: Open source"
                  disabled={isSubmitting}
                  onValidityChange={(valid) => {
                    if (valid) invalidTagFields.current.delete("interests");
                    else invalidTagFields.current.add("interests");
                  }}
                />
              )}
            />
          )}
        </Field>
        <Field
          label="Who do you want to meet?"
          optional
          error={errors.goals?.message}
        >
          {(p) => (
            <Textarea
              {...p}
              placeholder="For example: founders building developer tools"
              {...form.register("goals")}
            />
          )}
        </Field>
      </Card>

      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold">Links and contact details</h2>
          <p className="mt-1 text-sm text-muted">
            Each one starts as <strong>Only me</strong>. Choose who can see it.
            Anything someone has already seen can&apos;t be taken back, so share
            contact details only with people you trust.
          </p>
        </div>
        {links.fields.map((f, i) => (
          <fieldset
            key={f.id}
            className="flex flex-col gap-3 rounded-lg border border-line p-4"
          >
            <legend className="px-1 text-sm font-semibold">Link {i + 1}</legend>
            <Field label="Type" error={errors.links?.[i]?.kind?.message}>
              {(p) => (
                <Select {...p} {...form.register(`links.${i}.kind`)}>
                  {LINK_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {LINK_LABELS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Link, handle or number"
              error={errors.links?.[i]?.value?.message}
            >
              {(p) => <Input {...p} {...form.register(`links.${i}.value`)} />}
            </Field>
            <Field
              label="Who can see this"
              hint={VISIBILITY_HINTS[watchedLinks?.[i]?.visibility ?? "hidden"]}
              error={errors.links?.[i]?.visibility?.message}
            >
              {(p) => (
                <Select {...p} {...form.register(`links.${i}.visibility`)}>
                  {VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                      {VISIBILITY_LABELS[v]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => links.remove(i)}
            >
              Remove link {i + 1}
            </Button>
          </fieldset>
        ))}
        {errors.links?.message && (
          <p className="text-sm font-medium text-danger">
            {errors.links.message}
          </p>
        )}
        {links.fields.length < 10 && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() =>
              links.append({
                kind: "linkedin",
                value: "",
                visibility: "hidden",
              })
            }
          >
            Add a link
          </Button>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isPhotoUploading}
        >
          {onboarding ? "Save and preview" : "Save profile"}
        </Button>
        {!onboarding && (
          <Button
            variant="secondary"
            onClick={() => router.push("/attendee/profile")}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
