export type NavIcon = "home" | "event" | "account";

export type NavItem = { href: string; label: string; icon: NavIcon; exact?: boolean };

/**
 * Main navigation for the current event. Later slices add Guests, Budget,
 * Vendors, Checklist and Calendar here. Without an event, only Home shows.
 */
export function buildNavItems(eventId: string | null): NavItem[] {
  if (!eventId) {
    return [
      { href: "/app", label: "Home", icon: "home", exact: true },
      { href: "/app/settings/account", label: "Account", icon: "account" },
    ];
  }
  const base = `/app/events/${eventId}`;
  return [
    { href: base, label: "Home", icon: "home", exact: true },
    { href: `${base}/settings`, label: "Event details", icon: "event" },
    { href: "/app/settings/account", label: "Account", icon: "account" },
  ];
}
