"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Submit button that disables itself and says "Please wait…" while the form's action runs. */
export function SubmitButton({ children, pendingText = "Please wait…", ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
