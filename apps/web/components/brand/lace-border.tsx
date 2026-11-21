import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A quiet scalloped lace strip (DES-3). Purely decorative: hidden from
 * screen readers and never placed behind dense content.
 * Colour follows `currentColor`, so set it with a text class (default text-rosy).
 */
export function LaceBorder({
  flip = false,
  className,
}: {
  /** Point the scallops upward (use at the bottom of a card). */
  flip?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("block h-4 w-full text-rosy", flip && "rotate-180", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={id} width="24" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 0 A12 12 0 0 0 24 0" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M4 0 A8 8 0 0 0 20 0" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
          <circle cx="12" cy="4.5" r="1.3" fill="currentColor" opacity="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
