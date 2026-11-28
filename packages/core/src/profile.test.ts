import { describe, expect, it } from "vitest";
import { firstFieldErrors } from "./auth";
import { accountSettingsSchema } from "./profile";

describe("accountSettingsSchema", () => {
  it("trims the name and accepts CAD or USD", () => {
    expect(accountSettingsSchema.parse({ displayName: " Kim ", defaultCurrency: "cad" })).toEqual({
      displayName: "Kim",
      defaultCurrency: "cad",
    });
  });

  it("rejects an empty name and unknown currency", () => {
    const r = accountSettingsSchema.safeParse({ displayName: " ", defaultCurrency: "gbp" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(firstFieldErrors(r.error)).toEqual({ displayName: "Enter your name.", defaultCurrency: "Choose a currency." });
  });
});
