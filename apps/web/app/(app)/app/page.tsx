import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LaceBorder } from "@/components/brand/lace-border";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyEvents } from "@/lib/events";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AppHomePage() {
  const [user, events] = await Promise.all([requireUser(), getMyEvents()]);

  // Users with an event go straight to it (multi-event switching arrives with Premium).
  const first = events[0];
  if (first) redirect(`/app/events/${first.id}`);

  const firstName = user.name.split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-serif text-3xl text-plum md:text-4xl">
        {firstName ? `Welcome, ${firstName}` : "Welcome"}
      </h1>

      <Card className="overflow-hidden bg-ivory">
        <LaceBorder />
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="font-script text-5xl text-plum">Let&rsquo;s begin</p>
          <h2 className="font-serif text-2xl text-plum">Let&rsquo;s create your first event</h2>
          <p className="max-w-sm text-sm text-cloak">
            Add your wedding, shower, party or corporate event to start tracking guests, budget and vendors.
          </p>
          <Button asChild size="lg">
            <Link href="/app/events/new">Create your event</Link>
          </Button>
        </div>
        <LaceBorder flip />
      </Card>
    </div>
  );
}
