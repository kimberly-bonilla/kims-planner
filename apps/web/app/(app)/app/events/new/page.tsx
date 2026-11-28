import type { Metadata } from "next";
import Link from "next/link";
import { EVENT_LIMIT_MESSAGE, canCreateEvent } from "@kims-planner/core";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyEvents } from "@/lib/events";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Create your event" };

export default async function NewEventPage() {
  const [user, events] = await Promise.all([requireUser(), getMyEvents()]);
  const existing = events[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-serif text-3xl text-plum md:text-4xl">Create your event</h1>

      {canCreateEvent(events.length) ? (
        <Card className="bg-ivory p-6 sm:p-8">
          <EventForm
            mode="create"
            action={createEvent}
            cancelHref="/app"
            initialValues={{
              name: "",
              type: "wedding",
              customType: "",
              eventDate: "",
              city: "",
              venue: "",
              currency: user.defaultCurrency,
            }}
          />
        </Card>
      ) : (
        <Card className="flex flex-col items-start gap-4 bg-ivory p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-plum">You already have an event</h2>
          <p className="text-sm text-cloak">{EVENT_LIMIT_MESSAGE}</p>
          {existing && (
            <Button asChild>
              <Link href={`/app/events/${existing.id}`}>Go to {existing.name}</Link>
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
