import type { Metadata } from "next";
import { safeRedirectPath } from "@kims-planner/core";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-serif text-3xl text-plum">Welcome back</h1>
        <p className="text-sm text-cloak">Log in to keep planning.</p>
      </div>
      {error === "link" && (
        <p role="alert" className="rounded-md bg-chablis px-4 py-3 text-sm font-medium text-plum">
          That link has expired or was already used. Log in, or sign up again for a new link.
        </p>
      )}
      <AuthForm mode="login" next={safeRedirectPath(next)} />
    </div>
  );
}
