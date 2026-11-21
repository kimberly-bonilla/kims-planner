import { APP_TAGLINE } from "@kims-planner/core";
import { LaceBorder } from "@/components/brand/lace-border";
import { Wordmark } from "@/components/brand/wordmark";
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

          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-chablis px-4 py-2 text-sm font-medium text-plum">
            <span aria-hidden="true" className="size-2 rounded-full bg-sage" />
            Coming soon
          </p>
        </div>
        <LaceBorder flip />
      </Card>
    </main>
  );
}
