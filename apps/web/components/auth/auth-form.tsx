"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PASSWORD_MIN_LENGTH } from "@kims-planner/core";
import { logIn, signUp, type AuthFormState } from "@/app/(auth)/actions";
import { Field, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: AuthFormState = { status: "idle" };

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

      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}

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

      <SubmitButton className="w-full">{mode === "login" ? "Log in" : "Create account"}</SubmitButton>

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
