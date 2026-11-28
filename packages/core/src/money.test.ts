import { describe, expect, it } from "vitest";
import { formatMoney, isCurrency } from "./money";

describe("formatMoney", () => {
  it("always labels the currency so CAD and USD are never confused", () => {
    expect(formatMoney(123456, "cad")).toBe("CA$1,234.56");
    expect(formatMoney(123456, "usd")).toBe("US$1,234.56");
  });

  it("handles zero, cents and negatives", () => {
    expect(formatMoney(0, "usd")).toBe("US$0.00");
    expect(formatMoney(5, "cad")).toBe("CA$0.05");
    expect(formatMoney(-2500, "cad")).toBe("-CA$25.00");
  });

  it("rounds fractional cents", () => {
    expect(formatMoney(10.6, "usd")).toBe("US$0.11");
  });

  it("rejects non-numbers", () => {
    expect(() => formatMoney(Number.NaN, "usd")).toThrow();
  });
});

describe("isCurrency", () => {
  it("accepts only cad and usd", () => {
    expect(isCurrency("cad")).toBe(true);
    expect(isCurrency("usd")).toBe(true);
    expect(isCurrency("eur")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});
