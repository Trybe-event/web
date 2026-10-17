"use client";

import { X } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { addProfileTags } from "@/lib/profile-tags";
import { Button } from "./button";
import { Input } from "./field";

type TagInputProps = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "defaultValue"
> & {
  value: string[];
  onChange: (tags: string[]) => void;
  onValidityChange?: (valid: boolean) => void;
};

export function TagInput({
  value,
  onChange,
  onBlur,
  onValidityChange,
  ...inputProps
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const errorId = useId();
  function commit(incoming: string[], remaining = "") {
    const result = addProfileTags(value, incoming);
    setError(result.error);
    onValidityChange?.(!result.error);
    if (result.error) return;
    onChange(result.tags);
    setDraft(remaining);
  }
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul
          aria-label={`${inputProps["aria-label"] || "Selected"} tags`}
          className="flex flex-wrap gap-2"
        >
          {value.map((tag) => (
            <li
              key={tag.toLowerCase()}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-paper py-1 pl-3 text-sm text-ink"
            >
              <span className="break-all">{tag}</span>
              <Button
                variant="ghost"
                size="sm"
                className="!min-h-7 !rounded-full !px-2"
                aria-label={`Remove ${tag}`}
                disabled={inputProps.disabled}
                onClick={() => {
                  onChange(value.filter((item) => item !== tag));
                  if (!draft.trim()) {
                    setError(undefined);
                    onValidityChange?.(true);
                  }
                }}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Input
        {...inputProps}
        value={draft}
        aria-invalid={Boolean(error) || inputProps["aria-invalid"]}
        aria-describedby={
          [inputProps["aria-describedby"], error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => {
          const text = event.target.value;
          if (/[,\n]/.test(text)) {
            const fragments = text.split(/[,\n]/);
            const remaining = fragments.pop() || "";
            setDraft(text);
            commit(fragments, remaining);
          } else {
            setDraft(text);
            setError(undefined);
            onValidityChange?.(true);
          }
        }}
        onKeyDown={(event) => {
          if (
            !event.nativeEvent.isComposing &&
            (event.key === "Enter" || event.key === ",")
          ) {
            event.preventDefault();
            commit([draft]);
          }
        }}
        onBlur={(event) => {
          if (draft.trim()) commit([draft]);
          onBlur?.(event);
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
