import type { Metadata } from "next";
import {
  Inter,
  Montserrat,
  Poppins,
  Oswald,
  Anton,
} from "next/font/google";
import "./globals.css";

// Chat-overlay font choices, exposed as CSS variables and selectable per overlay.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-oswald",
});
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-anton",
});

const fontVars = [inter, montserrat, poppins, oswald, anton]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Babel — Unified Live Chat",
  description: "Twitch + Kick + X in one real-time feed for your stream.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
