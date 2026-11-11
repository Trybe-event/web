import { z } from "zod";

export const VERIFICATION_CODE_LENGTH = 6;

export function isCompleteVerificationCode(value: string): boolean {
  return value.length === VERIFICATION_CODE_LENGTH && /^[0-9]+$/.test(value);
}

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .refine(
      isCompleteVerificationCode,
      "Enter all six digits of your verification code.",
    ),
});
