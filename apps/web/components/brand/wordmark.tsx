import { APP_NAME } from "@kims-planner/core";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-6xl sm:text-7xl",
} as const;

/** The script wordmark (DES-1: a brand moment, so script is allowed). */
export function Wordmark({
  size = "md",
  as: Tag = "span",
  className,
}: {
  size?: keyof typeof sizes;
  as?: "span" | "h1" | "p";
  className?: string;
}) {
  return <Tag className={cn("font-script leading-tight text-plum", sizes[size], className)}>{APP_NAME}</Tag>;
}
