import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { BottomNav, SideNav } from "./app-nav";
import type { NavItem } from "./nav-items";
import { UserMenu } from "./user-menu";

/** Signed-in layout: top bar, side nav on laptops, bottom tabs on phones. */
export function AppShell({
  user,
  navItems,
  children,
}: {
  user: { name: string; email: string };
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-chablis/40">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-rosy/30 bg-ivory px-4 md:px-6">
        <Link href="/app" aria-label="Kim's Planner home" className="rounded-md">
          <Wordmark size="sm" />
        </Link>
        <UserMenu name={user.name} email={user.email} />
      </header>
      <div className="flex flex-1">
        <SideNav items={navItems} />
        <main id="main" className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav items={navItems} />
    </div>
  );
}
