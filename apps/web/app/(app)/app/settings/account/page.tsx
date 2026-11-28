import type { Metadata } from "next";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-serif text-3xl text-plum md:text-4xl">Account settings</h1>
      <Card className="bg-ivory p-6 sm:p-8">
        <AccountSettingsForm
          email={user.email}
          initialValues={{ displayName: user.name, defaultCurrency: user.defaultCurrency }}
        />
      </Card>
    </div>
  );
}
