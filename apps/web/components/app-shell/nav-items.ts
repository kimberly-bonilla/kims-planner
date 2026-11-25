/** Main navigation. Later slices add Guests, Budget, Vendors, Checklist, Calendar… */
export const navItems = [{ href: "/app", label: "Home", icon: "home" }] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
