"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MBLockup } from "./brand";
import { TwitchLogo, XLogo } from "./logos";

function SpotifyIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.56-1.15a.75.75 0 1 1-.33-1.46c4.58-1.05 8.5-.6 11.67 1.33.35.21.46.67.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.37-1.32 9.79-.68 13.5 1.6.44.27.58.85.31 1.29zm.13-3.4C15.78 8.26 8.9 8.03 5.1 9.18a1.13 1.13 0 1 1-.65-2.16C8.82 5.7 16.42 5.97 20.6 8.45a1.12 1.12 0 1 1-1.15 1.93z" />
    </svg>
  );
}
function TikTokIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.4v13.6a2.45 2.45 0 1 1-2.45-2.45c.26 0 .5.04.74.12V8.78a5.86 5.86 0 0 0-.74-.05 5.86 5.86 0 1 0 5.86 5.86V8.43a7.66 7.66 0 0 0 4.47 1.43V6.46a4.28 4.28 0 0 1-3.43-.64z" />
    </svg>
  );
}

const YEAR = 2026;

// Full site footer rendered at the end of the scrollable content pages
// (Market / News / legal). The live ticker tape stays pinned below it.
export function TermFooter() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  // reveal the columns as the footer scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer ref={ref} className={`term-foot ${shown ? "in" : ""}`}>
      <div className="term-foot-top">
        <div className="term-foot-brand">
          <Link href="/" className="reader-brand" aria-label="Market Bubble home">
            <MBLockup className="term-foot-lockup" />
          </Link>
          <p className="term-foot-tagline">
            Twitch, Kick &amp; X chat, prediction markets, and the crypto wire — one room.
          </p>
        </div>

        <nav className="term-foot-cols">
          <div className="term-foot-col">
            <span className="term-foot-head">Explore</span>
            <Link href="/">Home</Link>
            <Link href="/market">Market</Link>
            <Link href="/news">News</Link>
            <Link href="/content">Content</Link>
            <a href="/watch">Watch live</a>
          </div>
          <div className="term-foot-col">
            <span className="term-foot-head">Studio</span>
            <a href="/studio">Operator console</a>
          </div>
          <div className="term-foot-col">
            <span className="term-foot-head">Legal</span>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </nav>
      </div>

      <div className="term-foot-bottom">
        <div className="term-foot-socials">
          <a href="https://www.twitch.tv/fazebanks" target="_blank" rel="noreferrer" aria-label="Twitch"><TwitchLogo size={18} /></a>
          <a href="https://open.spotify.com/show/00yWnJPE80LSBglGwCrjZI" target="_blank" rel="noreferrer" aria-label="Spotify"><SpotifyIcon /></a>
          <a href="https://www.tiktok.com/@marketbubble" target="_blank" rel="noreferrer" aria-label="TikTok"><TikTokIcon /></a>
          <a href="https://x.com/MarketBubble" target="_blank" rel="noreferrer" aria-label="X"><XLogo size={15} /></a>
        </div>
        <span className="term-foot-copy">© {YEAR} Market Bubble · Live Thursdays 1PM PST</span>
        <span className="term-foot-presented">Presented by <b>Polymarket</b></span>
      </div>
    </footer>
  );
}
