import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, Pinyon_Script } from "next/font/google";
import { APP_NAME, APP_TAGLINE } from "@kims-planner/core";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});
// DES-1: script is for brand moments only (wordmark, month names, empty states).
const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF6F1", // eslint-disable-line no-restricted-syntax -- browser chrome colour must be a literal
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable} ${pinyon.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
