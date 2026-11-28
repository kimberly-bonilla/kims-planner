"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  EVENT_LIMIT_MESSAGE,
  canCreateEvent,
  eventSchema,
  eventToRow,
  firstFieldErrors,
  type FieldErrors,
} from "@kims-planner/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EventFormValues = {
  name: string;
  type: string;
  customType: string;
  eventDate: string;
  city: string;
  venue: string;
  currency: string;
};

export type EventFormState = {
  status: "idle" | "error" | "saved";
  message?: string;
  fieldErrors?: FieldErrors<EventFormValues>;
  values?: EventFormValues;
};

function readForm(formData: FormData): EventFormValues {
  const get = (k: keyof EventFormValues) => String(formData.get(k) ?? "");
  return {
    name: get("name"),
    type: get("type"),
    customType: get("customType"),
    eventDate: get("eventDate"),
    city: get("city"),
    venue: get("venue"),
    currency: get("currency"),
  };
}

const GENERIC_ERROR = "Something went wrong saving your event. Please try again.";

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireUser();
  const values = readForm(formData);

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error), values };

  const supabase = await createClient();

  // Friendly early check. The database trigger enforces the same limit for real.
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true });
  if (!canCreateEvent(count ?? 0)) return { status: "error", message: EVENT_LIMIT_MESSAGE, values };

  const { data, error } = await supabase.from("events").insert(eventToRow(parsed.data)).select("id").single();

  if (error) {
    const limitHit = error.message.includes("event_limit_reached");
    return { status: "error", message: limitHit ? EVENT_LIMIT_MESSAGE : GENERIC_ERROR, values };
  }

  revalidatePath("/app", "layout");
  redirect(`/app/events/${data.id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUser();
  const values = readForm(formData);

  if (!z.uuid().safeParse(eventId).success) return { status: "error", message: GENERIC_ERROR, values };

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error), values };

  const supabase = await createClient();
  // RLS limits this to the owner's own event; no row back means not theirs or gone.
  const { data, error } = await supabase
    .from("events")
    .update(eventToRow(parsed.data))
    .eq("id", eventId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { status: "error", message: GENERIC_ERROR, values };

  revalidatePath("/app", "layout");
  const saved = parsed.data;
  return {
    status: "saved",
    message: "Your changes are saved.",
    values: {
      name: saved.name,
      type: saved.type,
      customType: saved.customType ?? "",
      eventDate: saved.eventDate,
      city: saved.city ?? "",
      venue: saved.venue ?? "",
      currency: saved.currency,
    },
  };
}
