import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only auth-related paths. The public landing page and /api/health never
  // touch Supabase, so they stay up even if Supabase settings are missing.
  matcher: ["/app", "/app/:path*", "/login", "/signup", "/auth/:path*"],
};
