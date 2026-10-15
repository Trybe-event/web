"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useFieldArray,
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
  useToast,
} from "@/components/ui";
import { api, errorMessage, fieldErrors, type Schemas } from "@/lib/api/client";

import { LINK_LABELS, VISIBILITY_HINTS, VISIBILITY_LABELS } from "../labels";

const LINK_KINDS = Object.keys(LINK_LABELS) as Schemas["LinkKind"][];
const VISIBILITIES = Object.keys(VISIBILITY_LABELS) as Schemas["Visibility"][];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const tagList = z
  .string()
  .transform((s) => [
    ...new Map(
      s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => [t.toLowerCase(), t]),
    ).values(),
  ])
  .refine((tags) => tags.length <= 20, "Add up to 20.")
  .refine(
    (tags) => tags.every((t) => t.length <= 40),
    "Each one must be 40 characters or fewer.",
  );

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

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: fallbackName,
      role: "",
      bio: "",
      organization: "",
      goals: "",
      skills: "",
      interests: "",
      links: [],
    },
  });
  const links = useFieldArray({ control: form.control, name: "links" });
  const watchedName = useWatch({ control: form.control, name: "full_name" });
  const watchedLinks = useWatch({ control: form.control, name: "links" });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    api.GET("/me/profile").then(({ data, response, error }) => {
      if (data) {
        form.reset({
          full_name: data.full_name,
          role: data.role,
          bio: data.bio,
          organization: data.organization ?? "",
          goals: data.goals ?? "",
          skills: data.skills.join(", "),
          interests: data.interests.join(", "),
          links: data.links,
        });
        setPhoto({ key: data.photo_key ?? null, url: data.photo_url ?? null });
      } else if (response.status !== 404) {
        setFailure(errorMessage(error));
      }
      setLoaded(true);
    });
  }, [form]);

  async function uploadPhoto(file: File) {
    setPhotoStatus(null);
    if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number]))
      return setPhotoStatus("Choose a JPEG, PNG or WebP image.");
    if (file.size > MAX_PHOTO_BYTES)
      return setPhotoStatus("Choose an image of 5 MB or less.");
    setPhotoStatus("Uploading…");
    const { data, error } = await api.POST("/uploads", {
      body: {
        purpose: "avatar",
        content_type: file.type as (typeof PHOTO_TYPES)[number],
        size: file.size,
      },
    });
    if (!data)
      return setPhotoStatus(
        errorMessage(error, "Photo upload isn't available right now."),
      );
    const put = await fetch(data.upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!put.ok) return setPhotoStatus("The upload didn't finish. Try again.");
    setPhoto({ key: data.key, url: URL.createObjectURL(file) });
    setPhotoStatus("Photo ready. Save your profile to keep it.");
  }

  async function onSubmit(v: FormOut) {
    setFailure(null);
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
    if (!error) {
      toast("Profile saved");
      router.push(onboarding ? "/profile/preview?onboarding=1" : "/profile");
      router.refresh();
      return;
    }
    if (response.status === 400) {
      for (const [name, message] of Object.entries(fieldErrors(error)))
        form.setError(name as FieldPath<FormIn>, { message });
      setFailure("Some fields need attention.");
      return;
    }
    setFailure(errorMessage(error));
  }

  if (!loaded) return <Skeleton className="mt-8 h-96" />;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
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
          <div className="flex flex-col gap-1">
            <label htmlFor="photo" className="text-sm font-semibold">
              Profile photo{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="photo"
              type="file"
              accept={PHOTO_TYPES.join(",")}
              aria-describedby="photo-status"
              onChange={(e) =>
                e.target.files?.[0] && uploadPhoto(e.target.files[0])
              }
              className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-2 file:font-semibold"
            />
            <p id="photo-status" role="status" className="text-sm text-muted">
              {photoStatus ?? "JPEG, PNG or WebP, up to 5 MB."}
            </p>
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
          hint="Separate with commas, for example: React, TypeScript"
          error={errors.skills?.message}
        >
          {(p) => <Input {...p} {...form.register("skills")} />}
        </Field>
        <Field
          label="Interests"
          hint="Separate with commas, for example: Startups, Open source"
          error={errors.interests?.message}
        >
          {(p) => <Input {...p} {...form.register("interests")} />}
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
        <Button type="submit" loading={isSubmitting}>
          {onboarding ? "Save and preview" : "Save profile"}
        </Button>
        {!onboarding && (
          <Button variant="secondary" onClick={() => router.push("/profile")}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
