import { z } from "zod";

/** Matches minimum_password_length in supabase/config.toml (set the same in the hosted dashboard). */
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt, used by Supabase Auth, ignores bytes past 72. */
export const PASSWORD_MAX_LENGTH = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Use 80 characters or fewer."),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`),
});

export const logInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LogInInput = z.infer<typeof logInSchema>;

/** Field name -> first error message, for showing next to each input. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function firstFieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const out: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key !== undefined && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}

/**
 * Only allow redirects to paths on our own site (prevents open redirects
 * through ?next=https://evil.example). Falls back to `fallback`.
 */
export function safeRedirectPath(next: unknown, fallback = "/app"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

/** Turn Supabase Auth error messages into friendly, non-technical text. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Your email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try logging in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password")) return "Please choose a stronger password.";
  return "Something went wrong. Please try again.";
}
