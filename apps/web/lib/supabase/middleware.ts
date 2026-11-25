import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/** Paths that need a signed-in user. */
export function isProtectedPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/** Pages a signed-in user should skip. */
export function isAuthPage(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

/**
 * Refreshes the Supabase session cookie on every matched request and
 * redirects between the auth pages and the app as needed.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [h, v] of Object.entries(headers ?? {})) response.headers.set(h, v);
      },
    },
  });

  // Do not run code between createServerClient and getClaims (Supabase guidance).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    if (path === "/login") target.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  };

  if (!signedIn && isProtectedPath(pathname)) return redirectTo("/login");
  if (signedIn && isAuthPage(pathname)) return redirectTo("/app");

  if (isProtectedPath(pathname)) {
    // Private pages must never be served from the browser's back/forward cache.
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
}
