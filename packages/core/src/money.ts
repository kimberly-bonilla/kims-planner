/** Supported currencies (CAD and USD). Amounts are labelled, never converted. */
export const CURRENCIES = ["cad", "usd"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "cad", label: "CAD – Canadian dollar (CA$)" },
  { value: "usd", label: "USD – US dollar (US$)" },
];

const PREFIX: Record<Currency, string> = { cad: "CA$", usd: "US$" };

const number = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format an amount in cents. Always shows "CA$" or "US$" so the two
 * currencies can never be confused. Example: formatMoney(123456, "cad") -> "CA$1,234.56".
 */
export function formatMoney(cents: number, currency: Currency): string {
  if (!Number.isFinite(cents)) throw new Error(`Invalid amount: ${cents}`);
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${PREFIX[currency]}${number.format(Math.abs(rounded) / 100)}`;
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}
