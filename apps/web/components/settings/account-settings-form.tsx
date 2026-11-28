"use client";

import { useActionState } from "react";
import { CURRENCY_OPTIONS } from "@kims-planner/core";
import { updateAccountSettings, type AccountFormState, type AccountFormValues } from "@/app/(app)/app/settings/actions";
import { Field, FormMessage, SelectField } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

export function AccountSettingsForm({ email, initialValues }: { email: string; initialValues: AccountFormValues }) {
  const [state, formAction] = useActionState(updateAccountSettings, { status: "idle" } as AccountFormState);
  const values = state.values ?? initialValues;
  const fe = state.fieldErrors ?? {};

  return (
    <form key={JSON.stringify(state)} action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      {state.status === "saved" && state.message && <FormMessage tone="success">{state.message}</FormMessage>}

      <Field
        name="displayName"
        label="Your name"
        autoComplete="name"
        required
        maxLength={80}
        defaultValue={values.displayName}
        error={fe.displayName}
      />

      <Field label="Email" type="email" value={email} readOnly hint="Your email is used to log in." />

      <SelectField
        name="defaultCurrency"
        label="Default currency"
        hint="New events start with this currency. Each event can still choose its own."
        required
        defaultValue={values.defaultCurrency}
        error={fe.defaultCurrency}
      >
        {CURRENCY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </SelectField>

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
