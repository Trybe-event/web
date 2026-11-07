"use client";

import { useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export function EventRegistration({ slug }: { slug: string }) {
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">
          {mode === "sign-up" ? "Join the event" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {mode === "sign-up"
            ? "Create your attendee account, set up your profile and confirm your place."
            : "Sign in to continue to this event."}
        </p>
      </div>
      <AuthForm key={mode} type="attendee" mode={mode} eventSlug={slug} />
      <p className="text-sm text-muted">
        {mode === "sign-up" ? "Have an account? " : "New to Trybe? "}
        <button
          type="button"
          className="font-semibold text-ink underline underline-offset-4"
          onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
        >
          {mode === "sign-up" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
