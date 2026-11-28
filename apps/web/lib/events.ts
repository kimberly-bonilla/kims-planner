import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import type { Currency, EventType } from "@kims-planner/core";
import { createClient } from "@/lib/supabase/server";

export type EventRow = {
  id: string;
  name: string;
  type: EventType;
  custom_type: string | null;
  event_date: string;
  city: string | null;
  venue: string | null;
  currency: Currency;
  created_at: string;
};

const EVENT_COLUMNS = "id, name, type, custom_type, event_date, city, venue, currency, created_at";

/** The signed-in user's events, oldest first. RLS guarantees only their own rows come back. */
export const getMyEvents = cache(async (): Promise<EventRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("created_at", { ascending: true })
    .returns<EventRow[]>();
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return data ?? [];
});

/**
 * One event by id, or a 404. Another user's event also gives a 404 (RLS
 * returns no row), so we never reveal that it exists.
 */
export const getEventOr404 = cache(async (eventId: string): Promise<EventRow> => {
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (error) throw new Error(`Could not load event: ${error.message}`);
  if (!data) notFound();
  return data;
});
