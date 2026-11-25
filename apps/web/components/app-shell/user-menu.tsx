import { logOut } from "@/app/(auth)/actions";

/** Name + email with a log-out button. Uses <details> so it works without JavaScript. */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const initial = (name || email).trim().charAt(0).toUpperCase() || "?";
  return (
    <details className="group relative">
      {/*
        No aria-label here: the accessible name must contain the visible text
        (WCAG 2.5.3 "label in name"), so the visible name comes first and the
        extra hint is screen-reader-only text.
      */}
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full pl-1 pr-3 text-sm font-medium text-plum hover:bg-chablis [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-plum text-white">
          {initial}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{name || email}</span>
        <span className="sr-only">, account menu</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-rosy/40 bg-white p-2 shadow-lg">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-plum">{name || "Your account"}</p>
          <p className="truncate text-xs text-cloak">{email}</p>
        </div>
        <form action={logOut}>
          <button
            type="submit"
            className="flex h-11 w-full items-center rounded-md px-3 text-left text-sm text-plum hover:bg-chablis"
          >
            Log out
          </button>
        </form>
      </div>
    </details>
  );
}
