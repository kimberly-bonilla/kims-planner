"use server";

import { revalidatePath } from "next/cache";
import { accountSettingsSchema, firstFieldErrors, type FieldErrors } from "@kims-planner/core";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AccountFormValues = { displayName: string; defaultCurrency: string };

export type AccountFormState = {
  status: "idle" | "error" | "saved";
  message?: string;
  fieldErrors?: FieldErrors<AccountFormValues>;
  values?: AccountFormValues;
};

export async function updateAccountSettings(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const values: AccountFormValues = {
    displayName: String(formData.get("displayName") ?? ""),
    defaultCurrency: String(formData.get("defaultCurrency") ?? ""),
  };

  const parsed = accountSettingsSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, default_currency: parsed.data.defaultCurrency })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Something went wrong saving your settings. Please try again.", values };

  revalidatePath("/app", "layout");
  return { status: "saved", message: "Your settings are saved.", values: parsed.data };
}
