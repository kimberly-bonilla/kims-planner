/**
 * Design tokens from PRD section 9. Hex values come from the palette images;
 * the role mapping is the PRD's recommendation.
 *
 * The web app mirrors these in apps/web/app/globals.css (a test checks they
 * stay in sync). The mobile app will import them directly.
 */
export const palette = {
  /** Page background tint */
  chablis: "#F4DEDA",
  /** Soft fill, selected states */
  marzipan: "#EFBABC",
  /** Secondary accent */
  peach: "#DEA7AA",
  /** Borders, icons */
  rosy: "#BF928D",
  /** Muted text, dividers */
  cloak: "#8E6563",
  /** Primary text and buttons */
  plum: "#754B4D",
  /** Warm neutral surface */
  china: "#E0CBB9",
  /** Warm accent */
  rosewater: "#D8A694",
  /** Success and "Attending" accent */
  sage: "#A7A376",
  /** Cards and page background (proposed, not from an image) */
  ivory: "#FAF6F1",
  white: "#FFFFFF",
} as const;

export type PaletteName = keyof typeof palette;
