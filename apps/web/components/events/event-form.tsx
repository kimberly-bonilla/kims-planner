"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CURRENCY_OPTIONS, EVENT_TYPES } from "@kims-planner/core";
import type { EventFormState, EventFormValues } from "@/app/(app)/app/events/actions";
import { Field, FormMessage, SelectField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

type Props = {
  mode: "create" | "edit";
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  initialValues: EventFormValues;
  cancelHref: string;
};

export function EventForm({ mode, action, initialValues, cancelHref }: Props) {
  const [state, formAction] = useActionState(action, { status: "idle" } as EventFormState);
  const values = state.values ?? initialValues;
  const fe = state.fieldErrors ?? {};

  // Controlled so "Other" can reveal the custom type field instantly.
  const [type, setType] = useState(values.type);
  useEffect(() => {
    if (state.values) setType(state.values.type);
  }, [state.values]);

  return (
    // key: React resets uncontrolled fields after an action; remounting on each
    // result makes every field show the values the server sent back.
    <form key={JSON.stringify(state)} action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "saved" && state.message && <FormMessage tone="success">{state.message}</FormMessage>}

      <Field
        name="name"
        label="Event name"
        placeholder="e.g. Jordan & Sam's Wedding"
        required
        maxLength={100}
        defaultValue={values.name}
        error={fe.name}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="type"
          label="Event type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          error={fe.type}
        >
          <option value="" disabled>
            Choose a type
          </option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>

        <Field
          name="eventDate"
          label="Event date"
          type="date"
          required
          min="2000-01-01"
          max="2100-12-31"
          defaultValue={values.eventDate}
          error={fe.eventDate}
        />
      </div>

      {type === "other" && (
        <Field
          name="customType"
          label="What kind of event is it?"
          placeholder="e.g. Retirement party"
          required
          maxLength={60}
          defaultValue={values.customType}
          error={fe.customType}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="city"
          label="City"
          optional
          autoComplete="address-level2"
          maxLength={100}
          defaultValue={values.city}
          error={fe.city}
        />
        <Field name="venue" label="Venue" optional maxLength={150} defaultValue={values.venue} error={fe.venue} />
      </div>

      <SelectField
        name="currency"
        label="Currency"
        hint="Used for this event's budget. Amounts are never converted."
        required
        defaultValue={values.currency}
        error={fe.currency}
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>{mode === "create" ? "Cancel" : "Back to event"}</Link>
        </Button>
        <SubmitButton pendingText={mode === "create" ? "Creating…" : "Saving…"}>
          {mode === "create" ? "Create event" : "Save changes"}
        </SubmitButton>
      </div>
    </form>
  );
}
