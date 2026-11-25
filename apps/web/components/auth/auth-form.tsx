"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { PASSWORD_MIN_LENGTH } from "@kims-planner/core";
import { logIn, signUp, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = { status: "idle" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending ? "Please wait…" : children}
    </Button>
  );
}

function Field({
  name,
  label,
  error,
  hint,
  ...inputProps
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...inputProps} />
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

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, formAction] = useActionState(mode === "login" ? logIn : signUp, initialState);
  const fe = state.fieldErrors ?? {};

  if (state.status === "check-email") {
    return (
      <div role="status" className="flex flex-col gap-3 text-center">
        <h2 className="font-serif text-2xl text-plum">Check your email</h2>
        <p className="text-sm text-cloak">
          We sent a confirmation link to <strong className="text-plum">{state.values?.email}</strong>. Open it to
          finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.message && (
        <p role="alert" className="rounded-md bg-chablis px-4 py-3 text-sm font-medium text-plum">
          {state.message}
        </p>
      )}

      {mode === "signup" && (
        <Field
          name="displayName"
          label="Your name"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={state.values?.displayName}
          error={fe.displayName}
        />
      )}

      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={fe.email}
      />

      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
        hint={mode === "signup" ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
        error={fe.password}
      />

      <SubmitButton>{mode === "login" ? "Log in" : "Create account"}</SubmitButton>

      <p className="text-center text-sm text-cloak">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-plum underline underline-offset-4">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-plum underline underline-offset-4">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
