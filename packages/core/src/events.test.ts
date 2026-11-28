import { describe, expect, it } from "vitest";
import { firstFieldErrors } from "./auth";
import { canCreateEvent, eventSchema, eventToFormValues, eventToRow, eventTypeLabel, formatEventDate } from "./events";

const valid = {
  name: "  Our Wedding ",
  type: "wedding",
  customType: "",
  eventDate: "2028-06-15",
  city: " Toronto ",
  venue: "",
  currency: "cad",
};

describe("eventSchema", () => {
  it("accepts valid input, trims text and turns empty optional fields into null", () => {
    expect(eventSchema.parse(valid)).toEqual({
      name: "Our Wedding",
      type: "wedding",
      customType: null,
      eventDate: "2028-06-15",
      city: "Toronto",
      venue: null,
      currency: "cad",
    });
  });

  it("requires a custom type name for Other", () => {
    const r = eventSchema.safeParse({ ...valid, type: "other", customType: "  " });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstFieldErrors(r.error).customType).toBe("Tell us what kind of event it is.");
  });

  it("keeps the custom type for Other", () => {
    expect(eventSchema.parse({ ...valid, type: "other", customType: "Retirement party" }).customType).toBe(
      "Retirement party",
    );
  });

  it("drops a leftover custom type when the type is not Other", () => {
    expect(eventSchema.parse({ ...valid, type: "birthday_party", customType: "Retirement party" }).customType).toBeNull();
  });

  it("reports friendly errors for missing required fields", () => {
    const r = eventSchema.safeParse({ ...valid, name: "", type: "", eventDate: "", currency: "" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(firstFieldErrors(r.error)).toMatchObject({
      name: "Give your event a name.",
      type: "Choose an event type.",
      eventDate: "Choose the event date.",
      currency: "Choose a currency.",
    });
  });

  it.each(["2028-02-30", "15/06/2028", "1999-12-31", "2101-01-01"])("rejects the date %s", (eventDate) => {
    expect(eventSchema.safeParse({ ...valid, eventDate }).success).toBe(false);
  });

  it("accepts a leap day", () => {
    expect(eventSchema.safeParse({ ...valid, eventDate: "2028-02-29" }).success).toBe(true);
  });

  it("rejects currencies other than CAD and USD", () => {
    expect(eventSchema.safeParse({ ...valid, currency: "eur" }).success).toBe(false);
  });
});

describe("canCreateEvent", () => {
  it("allows the first event on the free plan and blocks the second", () => {
    expect(canCreateEvent(0)).toBe(true);
    expect(canCreateEvent(1)).toBe(false);
  });

  it("respects a higher limit", () => {
    expect(canCreateEvent(4, Infinity)).toBe(true);
  });
});

describe("eventTypeLabel", () => {
  it("labels built-in types and uses the custom name for Other", () => {
    expect(eventTypeLabel("bridal_shower")).toBe("Bridal shower");
    expect(eventTypeLabel("other", "Retirement party")).toBe("Retirement party");
    expect(eventTypeLabel("other", null)).toBe("Other");
  });
});

describe("row mapping", () => {
  it("round-trips between form values and database columns", () => {
    const input = eventSchema.parse(valid);
    const row = eventToRow(input);
    expect(row).toEqual({
      name: "Our Wedding",
      type: "wedding",
      custom_type: null,
      event_date: "2028-06-15",
      city: "Toronto",
      venue: null,
      currency: "cad",
    });
    expect(eventToFormValues(row)).toEqual({ ...input, customType: "", venue: "" });
  });
});

describe("formatEventDate", () => {
  it("formats the calendar date without shifting it by time zone", () => {
    expect(formatEventDate("2028-06-15")).toBe("Thursday, June 15, 2028");
    expect(formatEventDate("2028-01-01")).toBe("Saturday, January 1, 2028");
  });
});
