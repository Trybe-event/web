// Organizer and attendee accounts are separate (PRD §4). The web app uses the account
// type only for routing and display; the Go API is the authority and enforces it on
// every request.
export const ACCOUNT_TYPES = ["organizer", "attendee"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    (ACCOUNT_TYPES as readonly string[]).includes(value)
  );
}

/** Workspace home for an account type. */
export function workspacePath(type: AccountType): string {
  return type === "organizer" ? "/organizer" : "/attendee";
}
