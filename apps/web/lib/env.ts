/**
 * Public Supabase settings. NEXT_PUBLIC_* values are inlined at build time,
 * so they must be referenced literally (not via process.env[name]).
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Locally: copy .env.example to apps/web/.env.local. On Vercel: Settings -> Environment Variables.",
    );
  }
  // The client adds /auth/v1, /rest/v1 … itself; a pasted REST URL would break every call.
  return { url: url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""), key };
}
