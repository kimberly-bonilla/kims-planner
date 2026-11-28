import type { Metadata } from "next";
import Link from "next/link";
import { eventTypeLabel, formatEventDate } from "@kims-planner/core";
import { LaceBorder } from "@/components/brand/lace-border";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEventOr404 } from "@/lib/events";

type Params = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await getEventOr404((await params).eventId);
  return { title: event.name };
}

/** Event home. Slice 3 turns this into the dashboard (countdown and summaries). */
export default async function EventHomePage({ params }: Params) {
  const event = await getEventOr404((await params).eventId);
  const place = [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card className="overflow-hidden bg-ivory">
        <LaceBorder />
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-xs font-light uppercase tracking-[0.3em] text-cloak">
            {eventTypeLabel(event.type, event.custom_type)}
          </p>
          <h1 className="font-serif text-4xl text-plum md:text-5xl">{event.name}</h1>
          <p className="text-base text-plum">{formatEventDate(event.event_date)}</p>
          {place && <p className="text-sm text-cloak">{place}</p>}
          <Button asChild variant="outline" className="mt-3">
            <Link href={`/app/events/${event.id}/settings`}>Edit event details</Link>
          </Button>
        </div>
        <LaceBorder flip />
      </Card>
    </div>
  );
}
