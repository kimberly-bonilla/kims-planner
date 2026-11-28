import { z } from "zod";
import { CURRENCIES, type Currency } from "./money";

/** Event types from PRD section 2 (EVT-3), in the order the form shows them. */
export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "engagement_party", label: "Engagement party" },
  { value: "bridal_shower", label: "Bridal shower" },
  { value: "baby_shower", label: "Baby shower" },
  { value: "graduation_party", label: "Graduation party" },
  { value: "birthday_party", label: "Birthday party" },
  { value: "anniversary", label: "Anniversary" },
  { value: "corporate_event", label: "Corporate event" },
  { value: "other", label: "Other" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value) as [EventType, ...EventType[]];

/** "Wedding", or the user's own words for "Other" events. */
export function eventTypeLabel(type: EventType, customType?: string | null): string {
  if (type === "other") return customType?.trim() || "Other";
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? "Event";
}

/** Empty or whitespace-only text becomes null, so the database stores "not set" consistently. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((v) => (v === "" ? null : v));

const MIN_DATE = "2000-01-01";
const MAX_DATE = "2100-12-31";

export const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Give your event a name.").max(100, "Use 100 characters or fewer."),
    type: z.enum(EVENT_TYPE_VALUES, { error: "Choose an event type." }),
    customType: optionalText(60, "Use 60 characters or fewer."),
    eventDate: z
      .string()
      .min(1, "Choose the event date.")
      .pipe(z.iso.date("Enter a valid date."))
      .refine((d) => d >= MIN_DATE && d <= MAX_DATE, "Choose a date between 2000 and 2100."),
    city: optionalText(100, "Use 100 characters or fewer."),
    venue: optionalText(150, "Use 150 characters or fewer."),
    currency: z.enum(CURRENCIES, { error: "Choose a currency." }),
  })
  // "Other" needs the user's own type name; every other type must not keep one.
  .transform((e) => ({ ...e, customType: e.type === "other" ? e.customType : null }))
  .superRefine((e, ctx) => {
    if (e.type === "other" && !e.customType) {
      ctx.addIssue({ code: "custom", path: ["customType"], message: "Tell us what kind of event it is." });
    }
  });

export type EventInput = z.output<typeof eventSchema>;

/** Matches public.max_events_for() in the database. Slice 13 adds Premium. */
export const FREE_PLAN_EVENT_LIMIT = 1;

export function canCreateEvent(existingEventCount: number, limit: number = FREE_PLAN_EVENT_LIMIT): boolean {
  return existingEventCount < limit;
}

export const EVENT_LIMIT_MESSAGE =
  "The free plan includes 1 event. Upgrade to Premium for unlimited events.";

/** Map a database row (snake_case) to form values (camelCase). */
export function eventToFormValues(row: {
  name: string;
  type: EventType;
  custom_type: string | null;
  event_date: string;
  city: string | null;
  venue: string | null;
  currency: Currency;
}) {
  return {
    name: row.name,
    type: row.type,
    customType: row.custom_type ?? "",
    eventDate: row.event_date,
    city: row.city ?? "",
    venue: row.venue ?? "",
    currency: row.currency,
  };
}

/** Map validated input to database columns. */
export function eventToRow(e: EventInput) {
  return {
    name: e.name,
    type: e.type,
    custom_type: e.customType,
    event_date: e.eventDate,
    city: e.city,
    venue: e.venue,
    currency: e.currency,
  };
}

/** "Saturday, June 15, 2028" without time-zone shifting (dates are calendar dates, not instants). */
export function formatEventDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
