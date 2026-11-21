import { describe, expect, it } from "vitest";
import { contrastRatio, passesAA, relativeLuminance } from "./contrast";
import { palette } from "./theme";

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
  });

  it("rejects invalid hex", () => {
    expect(() => relativeLuminance("#FFF")).toThrow();
    expect(() => relativeLuminance("pink")).toThrow();
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });
});

// The pairings the PRD (DES-2) relies on.
describe("palette pairings from DES-2", () => {
  it("Plum Wine body text passes on Pink Chablis and ivory", () => {
    expect(passesAA(palette.plum, palette.chablis)).toBe(true);
    expect(passesAA(palette.plum, palette.ivory)).toBe(true);
  });

  it("white text passes on Plum Wine (primary buttons)", () => {
    expect(passesAA(palette.white, palette.plum)).toBe(true);
  });

  it("Plum Wine on Marzipan Pink is large/bold text only", () => {
    expect(passesAA(palette.plum, palette.marzipan)).toBe(false);
    expect(passesAA(palette.plum, palette.marzipan, true)).toBe(true);
  });

  it("white text fails on Marzipan and Peach Poppy", () => {
    expect(passesAA(palette.white, palette.marzipan, true)).toBe(false);
    expect(passesAA(palette.white, palette.peach, true)).toBe(false);
  });

  it("Cloak of Mystery muted text passes on ivory", () => {
    expect(passesAA(palette.cloak, palette.ivory)).toBe(true);
  });
});
