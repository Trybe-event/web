import { z } from "zod";

// Product minimum; configure the same minimum in the Clerk dashboard.
export const minimumPasswordLength = 8;

export const passwordRequirements = [
  {
    label: `At least ${minimumPasswordLength} characters`,
    test: (password: string) => password.length >= minimumPasswordLength,
  },
  {
    label: "A lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "An uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  { label: "A number", test: (password: string) => /[0-9]/.test(password) },
];

export const newPasswordSchema = z.string().superRefine((password, context) => {
  for (const requirement of passwordRequirements) {
    if (!requirement.test(password))
      context.addIssue({ code: "custom", message: requirement.label });
  }
});
