import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-serif text-3xl text-plum">Create your account</h1>
        <p className="text-sm text-cloak">Free for your first event.</p>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
