import { z } from "zod";

import { newPasswordSchema } from "./password-policy";

export function normalizeNigerianPhone(value: string): string | null {
  if (!/^[+0-9 ()-]+$/.test(value.trim())) return null;
  let digits = value.trim().replace(/[ ()-]/g, "");
  if (digits.startsWith("+234")) digits = digits.slice(4);
  else if (digits.startsWith("234") && digits.length === 13)
    digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^[0-9]{10}$/.test(digits) ? `+234${digits}` : null;
}

export const organizerSignupDetailsSchema = z
  .object({
    organization: z
      .string()
      .trim()
      .min(1, "Enter your registered business name.")
      .max(160, "Use 160 characters or fewer."),
    first_name: z
      .string()
      .trim()
      .min(1, "Enter the contact's first name.")
      .max(60, "Use 60 characters or fewer."),
    last_name: z
      .string()
      .trim()
      .min(1, "Enter the contact's last name.")
      .max(60, "Use 60 characters or fewer."),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => normalizeNigerianPhone(value) !== null,
        "Enter a valid Nigerian phone number.",
      ),
  })
  .superRefine((values, context) => {
    if (`${values.first_name} ${values.last_name}`.length > 120)
      context.addIssue({
        code: "custom",
        path: ["last_name"],
        message: "Use 120 characters or fewer for the contact's full name.",
      });
  });

export type OrganizerSignupDetails = z.infer<
  typeof organizerSignupDetailsSchema
>;

// Metadata only pre-fills a form. The API independently validates and binds the
// account type; this object is never an authorization claim.
export function organizerSignupDetails(
  value: unknown,
): OrganizerSignupDetails | undefined {
  const result = organizerSignupDetailsSchema.safeParse(value);
  return result.success
    ? { ...result.data, phone: normalizeNigerianPhone(result.data.phone)! }
    : undefined;
}

export function authenticationCredentialsSchema(
  organizerSignup: boolean,
  signingUp: boolean,
) {
  return z
    .object({
      email: z.email("Enter a valid email address."),
      password: signingUp
        ? newPasswordSchema
        : z.string().min(1, "Enter your password."),
      organization: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      phone: z.string(),
      confirm_password: z.string(),
    })
    .superRefine((values, context) => {
      if (!organizerSignup) return;
      const details = organizerSignupDetailsSchema.safeParse(values);
      if (!details.success)
        for (const issue of details.error.issues)
          context.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
      if (values.password !== values.confirm_password)
        context.addIssue({
          code: "custom",
          path: ["confirm_password"],
          message: "Passwords do not match.",
        });
    });
}
