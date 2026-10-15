// Whether Clerk is configured. Without keys the app still renders, and sign-in screens
// explain that account access isn't available yet instead of failing.
export function authConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
  );
}
