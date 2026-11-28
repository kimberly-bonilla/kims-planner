import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native <select>, styled to match Input. Native is fully keyboard and
 * screen-reader accessible and opens the phone's own picker on mobile.
 */
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-rosy bg-white pl-3 pr-10 text-base text-plum disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-plum aria-invalid:ring-1 aria-invalid:ring-plum md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-cloak"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
