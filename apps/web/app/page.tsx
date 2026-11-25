import { APP_TAGLINE } from "@kims-planner/core";
import { LaceBorder } from "@/components/brand/lace-border";
import { Wordmark } from "@/components/brand/wordmark";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  { title: "Guests & RSVPs", body: "Every guest and every reply, counted for you." },
  { title: "Budget", body: "Estimated and actual costs, category by category." },
  { title: "Vendors", body: "Contact several vendors at once and keep every reply in one place." },
];

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-chablis px-4 py-12">
      <Card className="w-full max-w-2xl overflow-hidden bg-ivory">
        <LaceBorder />
        <div className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-12">
          <p className="text-xs font-light uppercase tracking-[0.35em] text-cloak">Wedding &amp; event planning</p>
          <Wordmark as="h1" size="lg" />
          <p className="max-w-md font-serif text-2xl leading-snug text-plum">{APP_TAGLINE}</p>

          <ul className="mt-4 grid w-full gap-4 text-left sm:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="rounded-md border border-rosy/40 bg-white/70 p-4">
                <h2 className="font-serif text-lg font-semibold text-plum">{f.title}</h2>
                <p className="mt-1 text-sm text-cloak">{f.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Create your free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
        <LaceBorder flip />
      </Card>
    </main>
  );
}
