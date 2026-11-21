import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { palette, type PaletteName } from "@kims-planner/core";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

describe("globals.css tokens", () => {
  const names = (Object.keys(palette) as PaletteName[]).filter((n) => n !== "white");

  it.each(names)("--color-%s matches packages/core theme", (name) => {
    const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
    expect(match, `--color-${name} is missing from globals.css`).not.toBeNull();
    expect(match?.[1]?.toUpperCase()).toBe(palette[name].toUpperCase());
  });
});
