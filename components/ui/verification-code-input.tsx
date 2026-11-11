"use client";

import { forwardRef, useRef } from "react";
import { VERIFICATION_CODE_LENGTH } from "@/lib/verification-code";
import { Input } from "./field";

type VerificationCodeInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export const VerificationCodeInput = forwardRef<
  HTMLInputElement,
  VerificationCodeInputProps
>(function VerificationCodeInput(
  { id, value, onChange, onBlur, disabled, ...accessibilityProps },
  forwardedRef,
) {
  const digitInputs = useRef<(HTMLInputElement | null)[]>([]);

  function focusDigit(index: number) {
    const input =
      digitInputs.current[
        Math.max(0, Math.min(index, VERIFICATION_CODE_LENGTH - 1))
      ];
    input?.focus();
    input?.select();
  }

  function enterDigits(incoming: string, index: number) {
    if (disabled || !incoming || /[^0-9]/.test(incoming)) return;
    // A complete pasted/autofilled code replaces the whole value from any box.
    const start =
      incoming.length >= VERIFICATION_CODE_LENGTH
        ? 0
        : Math.min(index, value.length);
    const digits = incoming.slice(0, VERIFICATION_CODE_LENGTH - start);
    onChange(
      (
        value.slice(0, start) +
        digits +
        value.slice(start + digits.length)
      ).slice(0, VERIFICATION_CODE_LENGTH),
    );
    focusDigit(start + digits.length);
  }

  return (
    <div
      role="group"
      aria-label="Six-digit verification code"
      className="grid w-full max-w-80 grid-cols-6 gap-2"
    >
      {Array.from({ length: VERIFICATION_CODE_LENGTH }, (_, index) => (
        <Input
          key={index}
          {...accessibilityProps}
          id={index === 0 ? id : `${id}-${index + 1}`}
          ref={(input) => {
            digitInputs.current[index] = input;
            if (index === 0) {
              if (typeof forwardedRef === "function") forwardedRef(input);
              else if (forwardedRef) forwardedRef.current = input;
            }
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${VERIFICATION_CODE_LENGTH}`}
          className="min-w-0 px-0 text-center text-lg font-semibold tabular-nums"
          maxLength={VERIFICATION_CODE_LENGTH}
          value={value[index] ?? ""}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={onBlur}
          onChange={(event) => {
            if (disabled) return;
            if (!event.target.value) {
              onChange(value.slice(0, index) + value.slice(index + 1));
            } else enterDigits(event.target.value, index);
          }}
          onPaste={(event) => {
            event.preventDefault();
            enterDigits(event.clipboardData.getData("text"), index);
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === "Backspace") {
              event.preventDefault();
              const position = value[index]
                ? index
                : Math.min(index - 1, value.length - 1);
              if (position >= 0)
                onChange(value.slice(0, position) + value.slice(position + 1));
              focusDigit(index - 1);
            } else if (event.key === "Delete") {
              event.preventDefault();
              onChange(value.slice(0, index) + value.slice(index + 1));
            } else if (
              event.key === "ArrowLeft" ||
              event.key === "ArrowRight"
            ) {
              event.preventDefault();
              focusDigit(index + (event.key === "ArrowLeft" ? -1 : 1));
            } else if (event.key.length === 1 && !/^[0-9]$/.test(event.key)) {
              event.preventDefault();
            }
          }}
        />
      ))}
    </div>
  );
});
