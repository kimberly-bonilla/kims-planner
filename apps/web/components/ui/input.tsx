import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-md border border-rosy bg-white px-3 text-base text-plum placeholder:text-cloak/80 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-plum aria-invalid:ring-1 aria-invalid:ring-plum md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
