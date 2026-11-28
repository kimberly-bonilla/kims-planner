"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type FieldA11y = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

/**
 * Label + control + hint/error, wired for screen readers (NFR-8):
 * aria-invalid on errors and aria-describedby pointing at the hint/error text.
 */
function FieldFrame({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (a11y: FieldA11y) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-cloak"> (optional)</span>}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-cloak">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-plum">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string; optional?: boolean };

export function Field({ label, hint, error, optional, ...inputProps }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      {(a11y) => <Input {...inputProps} {...a11y} />}
    </FieldFrame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  children,
  ...selectProps
}: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      {(a11y) => (
        <Select {...selectProps} {...a11y}>
          {children}
        </Select>
      )}
    </FieldFrame>
  );
}

/** Form-level message: errors are announced immediately, success politely. */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-md bg-chablis px-4 py-3 text-sm font-medium text-plum"
          : "rounded-md border border-sage bg-white px-4 py-3 text-sm font-medium text-plum"
      }
    >
      {children}
    </p>
  );
}
