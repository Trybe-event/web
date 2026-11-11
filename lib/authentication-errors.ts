type AuthenticationErrorDetail = { message: string; code?: string };

const authenticationMessages: Record<string, string> = {
  form_password_pwned:
    "This password has appeared in a data breach. Choose a different password.",
  form_password_compromised:
    "This password is compromised. Use Forgot password to reset it.",
  form_password_incorrect:
    "The password is incorrect. Try again or reset your password.",
  form_identifier_exists:
    "An account with this email already exists. Sign in instead.",
  form_password_length_too_short:
    "Your password is too short. Follow the password requirements shown below.",
  form_password_not_strong_enough:
    "Choose a stronger password with less common words or patterns.",
  too_many_requests: "Too many attempts. Please wait before trying again.",
};

// Clerk API errors keep field details in errors[], not on the outer Error.
// Never expose developer exception messages, metadata or request data.
export function authenticationErrorDetail(
  error: unknown,
): AuthenticationErrorDetail {
  const visited = new Set<unknown>();
  function inspect(
    value: unknown,
    depth: number,
  ): AuthenticationErrorDetail | undefined {
    if (!value || typeof value !== "object" || visited.has(value) || depth > 4)
      return;
    visited.add(value);
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.errors)) {
      for (const apiError of record.errors) {
        const detail = inspect(apiError, depth + 1);
        if (detail) return detail;
      }
    }
    const cause = inspect(record.cause, depth + 1);
    if (cause) return cause;
    const code = typeof record.code === "string" ? record.code : undefined;
    const message =
      typeof record.longMessage === "string" && record.longMessage.trim()
        ? record.longMessage
        : typeof record.long_message === "string" && record.long_message.trim()
          ? record.long_message
          : code && authenticationMessages[code]
            ? authenticationMessages[code]
            : depth > 0 && code && typeof record.message === "string"
              ? record.message
              : undefined;
    if (message) return { message, code };
  }
  return (
    inspect(error, 0) || {
      message: "We couldn't complete that step. Please try again.",
    }
  );
}

// One answer for every sign-in that fails on the credentials, so the form never says
// whether an email has an account, which part was wrong, or what kind of account it is.
export const SIGN_IN_FAILED = "Incorrect email or password.";

const signInCredentialCodes = new Set([
  "form_identifier_not_found",
  "form_password_incorrect",
  "form_param_format_invalid",
  "form_param_nil",
  "form_param_unknown",
  "form_password_validation_failed",
  "strategy_for_user_invalid",
  "identification_deleted",
  "user_locked",
  "not_allowed_access",
]);

export function signInFailure(
  detail: AuthenticationErrorDetail,
): AuthenticationErrorDetail {
  if (detail.code === "too_many_requests") return detail;
  if (
    !detail.code ||
    signInCredentialCodes.has(detail.code) ||
    detail.code.startsWith("form_identifier") ||
    detail.code.startsWith("form_password")
  )
    return { message: SIGN_IN_FAILED, code: detail.code };
  return detail;
}

export class AuthenticationActionError extends Error {
  constructor(readonly detail: AuthenticationErrorDetail) {
    super(detail.message);
  }
}

export function assertAuthenticationSucceeded(result: {
  error: unknown | null;
}) {
  if (result.error)
    throw new AuthenticationActionError(
      authenticationErrorDetail(result.error),
    );
}
