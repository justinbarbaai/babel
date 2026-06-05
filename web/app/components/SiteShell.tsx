"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MBMark, MBWordmark } from "./brand";
import { ThemeToggle } from "./ThemeToggle";
import { TwitchLogo, XLogo } from "./logos";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/market", label: "Market" },
  { href: "/news", label: "News" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <header className="site-nav">
      <Link href="/" className="site-brand" aria-label="Market Bubble home">
        <MBMark size={26} />
        <MBWordmark className="site-brand-word" />
      </Link>

      <nav className="site-links">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="site-nav-right">
        <ThemeToggle />
        <a className="site-live-btn" href="/watch">
          <span className="site-live-dot" /> Watch live
        </a>
      </div>
    </header>
  );
}

function SpotifyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.56-1.15a.75.75 0 1 1-.33-1.46c4.58-1.05 8.5-.6 11.67 1.33.35.21.46.67.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.37-1.32 9.79-.68 13.5 1.6.44.27.58.85.31 1.29zm.13-3.4C15.78 8.26 8.9 8.03 5.1 9.18a1.13 1.13 0 1 1-.65-2.16C8.82 5.7 16.42 5.97 20.6 8.45a1.12 1.12 0 1 1-1.15 1.93z" />
    </svg>
  );
}
function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.4v13.6a2.45 2.45 0 1 1-2.45-2.45c.26 0 .5.04.74.12V8.78a5.86 5.86 0 0 0-.74-.05 5.86 5.86 0 1 0 5.86 5.86V8.43a7.66 7.66 0 0 0 4.47 1.43V6.46a4.28 4.28 0 0 1-3.43-.64z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <Link href="/" className="site-brand" aria-label="Market Bubble">
          <MBMark size={30} />
          <MBWordmark stacked className="site-brand-word" />
        </Link>
        <div className="site-footer-tag">
          <span className="site-quote">&ldquo;Invest in yourself&rdquo;</span>
          <span className="site-schedule">LIVE · THURSDAYS · 1PM PST</span>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="site-socials">
          <a href="https://twitch.tv" target="_blank" rel="noreferrer" aria-label="Twitch"><TwitchLogo size={18} /></a>
          <a href="https://open.spotify.com" target="_blank" rel="noreferrer" aria-label="Spotify"><SpotifyIcon /></a>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok"><TikTokIcon /></a>
          <a href="https://x.com/MarketBubble" target="_blank" rel="noreferrer" aria-label="X"><XLogo size={16} /></a>
        </div>
        <div className="site-presented">
          Presented by <b>Polymarket</b>
        </div>
        <Link href="/studio" className="site-studio-link">
          Studio ↗
        </Link>
      </div>
    </footer>
  );
}
