"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage, fieldErrors } from "@/lib/api/client";
import { type AccountType } from "@/lib/account";

import { SignOut } from "./sign-out";

const PHONE = /^\+?[0-9 ()-]{6,32}$/;

// One schema per account type: organizers must name their organization (PRD §7);
// attendees may add a private phone number (PRD §12).
function schemaFor(type: AccountType) {
  return z
    .object({
      full_name: z
        .string()
        .trim()
        .min(1, "Enter your name.")
        .max(120, "Too long."),
      organization: z.string().trim().max(160, "Too long."),
      phone: z.string().trim(),
      confirm: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (type === "organizer" && v.organization === "") {
        ctx.addIssue({
          code: "custom",
          path: ["organization"],
          message: "Enter your organization.",
        });
      }
      if (type === "attendee" && v.phone !== "" && !PHONE.test(v.phone)) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message:
            "Enter a phone number with digits and an optional leading +.",
        });
      }
      if (!v.confirm) {
        ctx.addIssue({
          code: "custom",
          path: ["confirm"],
          message: `Confirm that you want an ${type} account.`,
        });
      }
    });
}

type Values = z.infer<ReturnType<typeof schemaFor>>;

// After the account is created, organizers go to their workspace and attendees go
// straight into profile onboarding (PRD §12, §14).
const next: Record<AccountType, string> = {
  organizer: "/organizer",
  attendee: "/attendee/profile/edit?onboarding=1",
};

// CompleteAccount creates the one permanent account type for this sign-in.
export function CompleteAccount({
  type,
  defaultName,
}: {
  type: AccountType;
  defaultName: string;
}) {
  const [failure, setFailure] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schemaFor(type)),
    defaultValues: {
      full_name: defaultName,
      organization: "",
      phone: "",
      confirm: false,
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function submit(v: Values) {
    setFailure("");
    const res =
      type === "organizer"
        ? await api.POST("/accounts/organizer", {
            body: {
              full_name: v.full_name,
              organization: v.organization ?? "",
            },
          })
        : await api.POST("/accounts/attendee", {
            body: { full_name: v.full_name, phone: v.phone || null },
          });
    if (!res.error) {
      window.location.assign(next[type]);
      return;
    }
    if (res.response.status === 400) {
      for (const [name, message] of Object.entries(fieldErrors(res.error))) {
        form.setError(name as keyof Values, { message });
      }
      return;
    }
    setFailure(
      res.error.code === "account_type_conflict"
        ? `This sign-in already has a different Trybe account type. Organizer and attendee accounts are separate, so sign out and use another email to create an ${type} account.`
        : errorMessage(
            res.error,
            "We couldn't finish setup. Please try again.",
          ),
    );
  }

  return (
    <form
      className="complete-form"
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      <label htmlFor="full_name">Full name</label>
      <input
        id="full_name"
        autoComplete="name"
        aria-invalid={errors.full_name ? true : undefined}
        aria-describedby={errors.full_name ? "full_name-error" : undefined}
        {...form.register("full_name")}
      />
      {errors.full_name && (
        <p id="full_name-error" className="form-error">
          {errors.full_name.message}
        </p>
      )}

      {type === "organizer" ? (
        <>
          <label htmlFor="organization">Organization</label>
          <input
            id="organization"
            autoComplete="organization"
            aria-invalid={errors.organization ? true : undefined}
            aria-describedby={
              errors.organization ? "organization-error" : undefined
            }
            {...form.register("organization")}
          />
          {errors.organization && (
            <p id="organization-error" className="form-error">
              {errors.organization.message}
            </p>
          )}
        </>
      ) : (
        <>
          <label htmlFor="phone">
            Phone number <span className="optional">(optional)</span>
          </label>
          <p id="phone-hint" className="field-hint">
            Private. Never shown to other attendees or shared as WhatsApp.
          </p>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={
              errors.phone ? "phone-hint phone-error" : "phone-hint"
            }
            {...form.register("phone")}
          />
          {errors.phone && (
            <p id="phone-error" className="form-error">
              {errors.phone.message}
            </p>
          )}
        </>
      )}

      <div className="binding-notice">
        <LockKeyhole size={18} aria-hidden="true" />
        <p>
          You&apos;re creating an <strong>{type}</strong> account. This choice
          is permanent: this sign-in can&apos;t also create the other account
          type.
        </p>
      </div>
      <label className="confirm-choice">
        <input type="checkbox" {...form.register("confirm")} />I understand and
        want an {type} account.
      </label>
      {errors.confirm && <p className="form-error">{errors.confirm.message}</p>}
      {failure && (
        <p className="form-error" role="alert">
          {failure}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={isSubmitting}>
        {isSubmitting ? "Saving your account…" : `Create my ${type} account`}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <SignOut />
    </form>
  );
}
