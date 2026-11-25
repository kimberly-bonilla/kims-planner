/**
 * Helpers for database integration tests. They run against the LOCAL
 * Supabase stack only (`supabase start`), never the hosted project.
 *
 * Reuse `createSignedInUser` in every slice that adds a table to prove
 * Row Level Security: user B must not read or change user A's rows.
 */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasLocalSupabase =
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) && anonKey !== "" && serviceKey !== "";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Bypasses RLS. Test setup and assertions only. */
export function adminClient(): SupabaseClient {
  return createClient(url, serviceKey, noSession);
}

/** Not signed in. */
export function anonClient(): SupabaseClient {
  return createClient(url, anonKey, noSession);
}

export type TestUser = { id: string; email: string; client: SupabaseClient };

export async function createSignedInUser(displayName = "Test User"): Promise<TestUser> {
  const email = `it-${randomUUID()}@example.com`;
  const password = `pw-${randomUUID()}`;

  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { id: data.user.id, email, client };
}

export async function deleteUser(user: TestUser | undefined) {
  if (user) await adminClient().auth.admin.deleteUser(user.id);
}
