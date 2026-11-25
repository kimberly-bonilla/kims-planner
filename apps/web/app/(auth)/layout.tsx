import Link from "next/link";
import { LaceBorder } from "@/components/brand/lace-border";
import { Wordmark } from "@/components/brand/wordmark";
import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-chablis px-4 py-10">
      <Link href="/" aria-label="Kim's Planner home" className="rounded-md">
        <Wordmark size="md" />
      </Link>
      <Card className="w-full max-w-md overflow-hidden bg-ivory">
        <LaceBorder />
        <div className="px-6 py-8 sm:px-8">{children}</div>
        <LaceBorder flip />
      </Card>
    </main>
  );
}
