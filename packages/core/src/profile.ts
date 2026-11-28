import { z } from "zod";
import { CURRENCIES } from "./money";

export const accountSettingsSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer."),
  defaultCurrency: z.enum(CURRENCIES, { error: "Choose a currency." }),
});

export type AccountSettingsInput = z.infer<typeof accountSettingsSchema>;
