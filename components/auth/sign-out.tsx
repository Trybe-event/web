"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export function SignOut() {
  return (
    <SignOutButton redirectUrl="/">
      <button type="button" className="secondary-button">
        <LogOut size={16} aria-hidden="true" />
        Sign out
      </button>
    </SignOutButton>
  );
}
