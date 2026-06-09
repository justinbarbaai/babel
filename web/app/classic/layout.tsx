import type { ReactNode } from "react";
import { Silkscreen } from "next/font/google";
import "./classic.css";

// A bitmap pixel face for the System UI (menu bar, window titles, labels).
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-pixel",
});

export default function ClassicLayout({ children }: { children: ReactNode }) {
  return <div className={`${pixel.variable} cls-root`}>{children}</div>;
}
