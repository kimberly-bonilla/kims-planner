import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isCurrency, type Currency } from "@kims-planner/core";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user and their profile, or a redirect to /login.
 * Cached per request so layouts and pages can both call it.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, default_currency")
    .eq("id", user.id)
    .maybeSingle();

  const defaultCurrency: Currency = isCurrency(profile?.default_currency) ? profile.default_currency : "usd";

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.display_name ?? (user.user_metadata?.display_name as string | undefined) ?? "",
    defaultCurrency,
  };
});
