import type { Metadata } from "next";
import { eventToFormValues } from "@kims-planner/core";
import { EventForm } from "@/components/events/event-form";
import { Card } from "@/components/ui/card";
import { getEventOr404 } from "@/lib/events";
import { updateEvent } from "../../actions";

type Params = { params: Promise<{ eventId: string }> };

export const metadata: Metadata = { title: "Event details" };

export default async function EventSettingsPage({ params }: Params) {
  const event = await getEventOr404((await params).eventId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl text-plum md:text-4xl">Event details</h1>
        <p className="text-sm text-cloak">You can change any of these at any time.</p>
      </div>
      <Card className="bg-ivory p-6 sm:p-8">
        <EventForm
          mode="edit"
          action={updateEvent.bind(null, event.id)}
          cancelHref={`/app/events/${event.id}`}
          initialValues={eventToFormValues(event)}
        />
      </Card>
    </div>
  );
}
