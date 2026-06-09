"use client";

import { useEffect, useRef, useState } from "react";
import { useHub } from "../lib/useHub";
import { MediaPlayer } from "../components/MediaPlayer";
import type { Media } from "../lib/media";
import type { Stream } from "../lib/showContent";
import { MacWindow } from "./MacWindow";

function twitchVodId(url?: string): string | null {
  const m = (url || "").match(/videos\/(\d+)/);
  return m ? m[1] : null;
}

// ---- rainbow Apple (the six-stripe 1980s logo) ----
function RainbowApple({ size = 16 }: { size?: number }) {
  const stripes = ["#5fb44a", "#f5e003", "#f08a1d", "#e23b35", "#8a3f97", "#3b8ed0"];
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden>
      <defs>
        <clipPath id="apple">
          <path d="M27 0c0 4-3 7-7 8 0-4 3-7 7-8zM33 16c-2 1-3 3-3 6 0 4 3 7 5 8-2 5-5 9-8 9-2 0-3-1-6-1s-4 1-6 1c-4 0-9-7-9-15 0-7 4-11 8-11 2 0 4 1 6 1s3-1 6-1c2 0 5 1 7 3z" />
        </clipPath>
      </defs>
      <g clipPath="url(#apple)">
        {stripes.map((c, i) => (
          <rect key={i} x="0" y={(48 / 6) * i} width="40" height={48 / 6} fill={c} />
        ))}
      </g>
    </svg>
  );
}

// ---- a pixel "Happy Mac" for the boot ----
function HappyMac() {
  return (
    <svg width="48" height="56" viewBox="0 0 24 28" aria-hidden style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="1" width="20" height="26" fill="none" stroke="#000" strokeWidth="1.4" rx="2" />
      <rect x="4" y="3" width="16" height="13" fill="#fff" stroke="#000" strokeWidth="1.2" />
      {/* eyes + smile */}
      <rect x="8" y="6" width="1.6" height="2.4" fill="#000" />
      <rect x="14" y="6" width="1.6" height="2.4" fill="#000" />
      <path d="M8 11 q4 3 8 0" fill="none" stroke="#000" strokeWidth="1.2" />
      {/* disk slot */}
      <rect x="6" y="19" width="12" height="1.6" fill="#000" />
    </svg>
  );
}

type BootPhase = "off" | "happy" | "welcome" | "done";

export default function ClassicPage() {
  const { hubHttpUrl } = useHub();
  const [boot, setBoot] = useState<BootPhase>("off");
  const [vods, setVods] = useState<Stream[]>([]);
  const [selected, setSelected] = useState<Stream | null>(null);
  const [showWin, setShowWin] = useState(true);
  const [mktWin, setMktWin] = useState(true);
  const [clock, setClock] = useState("");
  const [markets, setMarkets] = useState<{ name: string; ticker: string; price: number; changePct: number }[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ w: 620, h: 460 });

  // mark the route so the global mini-player / modal chrome is hidden here
  useEffect(() => {
    document.documentElement.classList.add("cls-mode");
    return () => document.documentElement.classList.remove("cls-mode");
  }, []);

  // boot timeline
  useEffect(() => {
    const t1 = setTimeout(() => setBoot("happy"), 250);
    const t2 = setTimeout(() => setBoot("welcome"), 1500);
    const t3 = setTimeout(() => setBoot("done"), 2700);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  // live clock (menu bar)
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  // screen bounds for window clamping
  useEffect(() => {
    const measure = () => {
      const el = screenRef.current;
      if (el) setBounds({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [boot]);

  // live podcast VODs
  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    fetch(`${hubHttpUrl}/content`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const tw: Stream[] = (d.streams || []).filter(
          (s: Stream) => (s as { source?: string }).source !== "kick" && twitchVodId(s.url)
        );
        setVods(tw);
        setSelected((cur) => cur || tw[0] || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hubHttpUrl]);

  // live markets
  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    const load = () =>
      fetch(`${hubHttpUrl}/markets`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setMarkets([...(d.equities || []), ...(d.crypto || [])].slice(0, 7));
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [hubHttpUrl]);

  const heroMedia: Media | null = selected
    ? { kind: "vod", title: selected.title, url: selected.url, source: "twitch" }
    : null;

  return (
    <div className="cls-scene">
      <div className="mac">
        {/* ---- CRT ---- */}
        <div className="mac-bezel">
          <div className="mac-screen" ref={screenRef}>
            <div className="crt-glass" aria-hidden />

            {boot !== "done" ? (
              <div className="boot">
                {boot === "happy" && <HappyMac />}
                {boot === "welcome" && (
                  <div className="boot-welcome">
                    <HappyMac />
                    <span>Welcome to Market&nbsp;Bubble</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="dt">
                {/* ---- menu bar ---- */}
                <div className="dt-menubar">
                  <span className="dt-apple"><RainbowApple size={11} /></span>
                  <span className="dt-menu">File</span>
                  <span className="dt-menu">Edit</span>
                  <span className="dt-menu">View</span>
                  <span className="dt-menu">Special</span>
                  <span className="dt-menu-spacer" />
                  <span className="dt-clock">{clock}</span>
                </div>

                {/* ---- desktop icons ---- */}
                <div className="dt-icons">
                  <button className="dt-icon" onClick={() => setShowWin(true)} title="Open The Show">
                    <span className="dt-icon-glyph dt-glyph-hd" />
                    <span className="dt-icon-label">Market Bubble</span>
                  </button>
                  <button className="dt-icon" onClick={() => setMktWin(true)} title="Open Markets">
                    <span className="dt-icon-glyph dt-glyph-doc" />
                    <span className="dt-icon-label">Markets</span>
                  </button>
                  <button className="dt-icon dt-trash" title="Trash">
                    <span className="dt-icon-glyph dt-glyph-trash" />
                    <span className="dt-icon-label">Trash</span>
                  </button>
                </div>

                {/* ---- The Show (podcast) window ---- */}
                {showWin && (
                  <MacWindow
                    title="The Show"
                    initial={{ x: 16, y: 40 }}
                    width={356}
                    bounds={bounds}
                    onClose={() => setShowWin(false)}
                  >
                    <div className="show-win">
                      <div className="show-video">
                        {heroMedia ? (
                          <MediaPlayer media={heroMedia} muted />
                        ) : (
                          <div className="show-loading">Inserting disk…</div>
                        )}
                      </div>
                      <div className="show-meta">
                        <span className="show-badge">▶ REPLAY</span>
                        <span className="show-title">{heroMedia?.title || "Market Bubble"}</span>
                      </div>
                      {vods.length > 1 && (
                        <div className="show-rail">
                          {vods.slice(0, 5).map((v, i) => (
                            <button
                              key={i}
                              className={`show-chip ${selected?.url === v.url ? "on" : ""}`}
                              onClick={() => setSelected(v)}
                              title={v.title}
                            >
                              {v.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </MacWindow>
                )}

                {/* ---- Markets desk accessory ---- */}
                {mktWin && (
                  <MacWindow
                    title="Markets"
                    initial={{ x: 392, y: 168 }}
                    width={172}
                    bounds={bounds}
                    onClose={() => setMktWin(false)}
                  >
                    <div className="mkt-win">
                      {markets.length === 0 && <div className="mkt-row mkt-empty">Reading tape…</div>}
                      {markets.map((m) => (
                        <div className="mkt-row" key={m.ticker}>
                          <span className="mkt-tk">{m.ticker}</span>
                          <span className="mkt-px">
                            {m.price < 10 ? m.price.toFixed(3) : m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className={`mkt-ch ${m.changePct >= 0 ? "up" : "down"}`}>
                            {m.changePct >= 0 ? "▲" : "▼"} {Math.abs(m.changePct).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </MacWindow>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---- chin: apple + label + floppy slot + vents ---- */}
        <div className="mac-chin">
          <div className="mac-brand">
            <RainbowApple size={15} />
            <span className="mac-brand-name">Market&nbsp;Bubble</span>
          </div>
          <div className="mac-floppy" aria-hidden />
          <div className="mac-vents" aria-hidden />
        </div>
      </div>
    </div>
  );
}
