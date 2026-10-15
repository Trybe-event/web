/**
 * Account-type model for the strict organizer / attendee separation
 * (PRD sections 4, 6, 40). The web app treats these as display and routing
 * hints only. The Go API is the source of truth and enforces the immutable
 * account type on every protected action. Separate routes never grant
 * authorization on their own.
 */

export const ACCOUNT_TYPES = ["organizer", "attendee"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    (ACCOUNT_TYPES as readonly string[]).includes(value)
  );
}

/** Workspace landing route for a given account type. */
export function workspacePath(type: AccountType): string {
  return type === "organizer" ? "/organizer" : "/attendee";
}
