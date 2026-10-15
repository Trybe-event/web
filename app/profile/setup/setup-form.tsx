"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, Button, Field, Input } from "@/components/ui";
import { api, errorMessage, fieldErrors } from "@/lib/api/client";

const schema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(120, "Too long."),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\+?[0-9 ()-]{6,32}$/.test(v),
      "Enter a phone number with digits and an optional leading +.",
    ),
});
type Values = z.infer<typeof schema>;

export function SetupForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: defaultName, phone: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    setFailure(null);
    const { error, response } = await api.POST("/accounts/attendee", {
      body: { full_name: values.full_name, phone: values.phone || null },
    });
    if (!error) {
      router.replace("/profile/edit?onboarding=1");
      return;
    }
    if (response.status === 400) {
      for (const [name, message] of Object.entries(fieldErrors(error)))
        form.setError(name as keyof Values, { message });
      return;
    }
    setFailure(
      error.code === "account_type_conflict"
        ? "This sign-in is already an organizer account. Organizer and attendee accounts are separate, so sign out and use a different email to join events."
        : errorMessage(error),
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="mt-8 flex flex-col gap-5"
    >
      {failure && <Alert>{failure}</Alert>}
      <Field label="Full name" error={errors.full_name?.message}>
        {(p) => (
          <Input {...p} autoComplete="name" {...form.register("full_name")} />
        )}
      </Field>
      <Field
        label="Phone number"
        optional
        hint="Private. Only used for your account; it's never shown to other attendees or shared as WhatsApp."
        error={errors.phone?.message}
      >
        {(p) => (
          <Input
            {...p}
            type="tel"
            autoComplete="tel"
            {...form.register("phone")}
          />
        )}
      </Field>
      <Button type="submit" loading={isSubmitting} className="self-start">
        Continue
      </Button>
    </form>
  );
}
