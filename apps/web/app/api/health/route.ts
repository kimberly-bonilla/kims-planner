import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness check used by uptime monitors and the Playwright web server. */
export function GET() {
  return NextResponse.json({ ok: true });
}
