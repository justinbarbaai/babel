"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MBMark, MBWordmark } from "./brand";
import { ThemeToggle } from "./ThemeToggle";
import { Ticker } from "./Ticker";
import { useHub } from "../lib/useHub";
import { getAuth, startLogin, clearAuth, type TwitchAuth } from "../lib/twitchAuth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/market", label: "Market" },
  { href: "/news", label: "News" },
];

/**
 * Shared terminal-room chrome for the public content pages (Market / News),
 * mirroring the layout of the home room: a terminal top bar, a dotted
 * workspace canvas, and the live ticker tape along the bottom.
 */
export function TermShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { hubConnected } = useHub();
  const [auth, setAuth] = useState<TwitchAuth | null>(null);

  useEffect(() => {
    setAuth(getAuth());
  }, []);

  return (
    <div className="term">
      {/* ---- terminal top bar ---- */}
      <header className="term-bar">
        <div className="term-bar-left">
          <Link href="/" className="term-logo" aria-label="Market Bubble">
            <MBMark size={24} />
            <MBWordmark className="term-wordmark" />
          </Link>
          <nav className="term-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="term-bar-right">
          <span className={`term-status ${hubConnected ? "on" : ""}`}>
            <span className="term-status-dot" /> {hubConnected ? "LIVE" : "OFFLINE"}
          </span>
          <ThemeToggle className="term-icon" />
          <a className="term-auth term-studio" href="/studio" title="Market Bubble Studio (admin)">
            Studio
          </a>
          {auth ? (
            <button className="term-auth" onClick={() => { clearAuth(); setAuth(null); }}>
              @{auth.login} · logout
            </button>
          ) : (
            <button className="term-auth" onClick={() => startLogin(path)}>
              Log in
            </button>
          )}
        </div>
      </header>

      {/* ---- dotted workspace canvas ---- */}
      <div className="work term-page">
        <div className="term-page-inner">{children}</div>
      </div>

      {/* ---- bottom tape: live market ticker + brand ---- */}
      <footer className="term-tape">
        <span className="term-tape-cap left">Invest in yourself</span>
        <div className="term-tape-ticker"><Ticker /></div>
        <span className="term-tape-cap right">LIVE THURS 1PM · <b>Polymarket</b></span>
      </footer>
    </div>
  );
}
