"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function SignOut({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        className="secondary-button"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={16} aria-hidden="true" />
        {!iconOnly && <span className="sign-out-label">Sign out</span>}
      </button>
    </SignOutButton>
  );
}
