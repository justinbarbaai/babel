import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Bubble — Unified Live Chat",
  description: "Twitch + X + Kick in one real-time overlay for your stream.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
