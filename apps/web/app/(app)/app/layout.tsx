import { AppShell } from "@/components/app-shell/app-shell";
import { buildNavItems } from "@/components/app-shell/nav-items";
import { requireUser } from "@/lib/auth";
import { getMyEvents } from "@/lib/events";

// Private, per-user pages: never prerender or cache.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, events] = await Promise.all([requireUser(), getMyEvents()]);
  // Free users have one event; Premium's event switcher (Slice 13) will pick the current one.
  const currentEventId = events[0]?.id ?? null;
  return (
    <AppShell user={{ name: user.name, email: user.email }} navItems={buildNavItems(currentEventId)}>
      {children}
    </AppShell>
  );
}
