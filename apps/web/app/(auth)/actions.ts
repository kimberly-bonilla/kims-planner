"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  firstFieldErrors,
  friendlyAuthError,
  logInSchema,
  safeRedirectPath,
  signUpSchema,
  type FieldErrors,
} from "@kims-planner/core";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "error" | "check-email";
  message?: string;
  fieldErrors?: FieldErrors<{ displayName: string; email: string; password: string }>;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: { displayName?: string; email?: string };
};

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { displayName: raw.displayName, email: raw.email };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/app`,
    },
  });

  if (error) return { status: "error", message: friendlyAuthError(error.message), values };

  // Email confirmation off (local dev / CI): the user is signed in already.
  if (data.session) redirect("/app");

  return { status: "check-email", values: { email: parsed.data.email } };
}

export async function logIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { email: raw.email };

  const parsed = logInSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: friendlyAuthError(error.message), values };

  redirect(safeRedirectPath(formData.get("next")));
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
