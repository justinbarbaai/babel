"use client";

import { useEffect, useRef, useState } from "react";
import { useHub } from "../lib/useHub";
import { MediaPlayer } from "../components/MediaPlayer";
import type { Media } from "../lib/media";
import type { Stream } from "../lib/showContent";
import { MacWindow } from "./MacWindow";
import { ChatWindow } from "./ChatWindow";
import { NewsWindow } from "./NewsWindow";
import { PolymarketWindow } from "./PolymarketWindow";
import { Dock, type DockItem } from "./Dock";
import { useChime } from "./useChime";

function twitchVodId(url?: string): string | null {
  const m = (url || "").match(/videos\/(\d+)/);
  return m ? m[1] : null;
}

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

function HappyMac() {
  return (
    <svg width="56" height="64" viewBox="0 0 24 28" aria-hidden style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="1" width="20" height="26" fill="none" stroke="#dfeee8" strokeWidth="1.4" rx="2" />
      <rect x="4" y="3" width="16" height="13" fill="none" stroke="#dfeee8" strokeWidth="1.2" />
      <rect x="8" y="6" width="1.6" height="2.4" fill="#dfeee8" />
      <rect x="14" y="6" width="1.6" height="2.4" fill="#dfeee8" />
      <path d="M8 11 q4 3 8 0" fill="none" stroke="#dfeee8" strokeWidth="1.2" />
      <rect x="6" y="19" width="12" height="1.6" fill="#dfeee8" />
    </svg>
  );
}

const GTv = (<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><rect x="2.5" y="5" width="19" height="13" rx="2" fill="#1c1c1c" stroke="#fff" strokeWidth="1.2" /><path d="M10 9.5l5 2.8-5 2.8z" fill="#fff" /></svg>);
const GChart = (<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><rect x="3" y="13" width="4" height="7" fill="#2fbf71" /><rect x="10" y="8" width="4" height="12" fill="#3ea6ff" /><rect x="17" y="4" width="4" height="16" fill="#f0a020" /></svg>);
const GChat = (<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><path d="M3 5h18v11H9l-4 4v-4H3z" fill="#a970ff" stroke="#fff" strokeWidth="1" /><circle cx="8" cy="10.5" r="1.3" fill="#fff" /><circle cx="12" cy="10.5" r="1.3" fill="#fff" /><circle cx="16" cy="10.5" r="1.3" fill="#fff" /></svg>);
const GNews = (<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><rect x="3" y="4" width="18" height="16" rx="1.5" fill="#f4f1e6" stroke="#333" strokeWidth="1" /><rect x="5.5" y="6.5" width="7" height="6" fill="#cfc7b2" /><rect x="14" y="6.5" width="5" height="1.4" fill="#555" /><rect x="14" y="9.5" width="5" height="1.4" fill="#555" /><rect x="5.5" y="14.5" width="13.5" height="1.3" fill="#555" /><rect x="5.5" y="17" width="13.5" height="1.3" fill="#555" /></svg>);
const GPoly = (<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><circle cx="12" cy="12" r="9" fill="#1652f0" stroke="#fff" strokeWidth="1" /><path d="M12 12 L12 3.2 A9 9 0 0 1 20 14 Z" fill="#5b8bff" /><text x="12" y="15.5" fontSize="7" fill="#fff" textAnchor="middle" fontFamily="monospace">%</text></svg>);
const GTrash = (<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d="M6 8h12l-1 12H7z" fill="#cfcfcf" stroke="#333" strokeWidth="1" /><rect x="5" y="5.5" width="14" height="2.2" rx="1" fill="#9a9a9a" stroke="#333" strokeWidth="0.8" /></svg>);

type View = "desk" | "watch";
type BootPhase = "flicker" | "happy" | "done";
type MenuItem = { label: string; action?: () => void; disabled?: boolean } | "---";
type WinKey = "show" | "mkt" | "chat" | "news" | "poly" | "trash" | "patterns" | "about";

const PATTERNS: { key: string; label: string; style: React.CSSProperties }[] = [
  { key: "gray", label: "Gray", style: { backgroundColor: "#9c9c9c", backgroundImage: "repeating-conic-gradient(#8f8f8f 0% 25%, #a6a6a6 0% 50%)", backgroundSize: "4px 4px" } },
  { key: "mac", label: "Classic", style: { backgroundColor: "#5b7f8c", backgroundImage: "repeating-conic-gradient(#54757f 0% 25%, #62848f 0% 50%)", backgroundSize: "4px 4px" } },
  { key: "dots", label: "Dots", style: { backgroundColor: "#cfcabf", backgroundImage: "radial-gradient(#8a857a 1px, transparent 1px)", backgroundSize: "6px 6px" } },
  { key: "twill", label: "Twill", style: { backgroundColor: "#b9b4a8", backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.09) 0 3px, transparent 3px 6px)" } },
  { key: "bubble", label: "Bubble", style: { background: "radial-gradient(120% 100% at 30% 0%, #b9a7e6, #6e5bb0)" } },
  { key: "aqua", label: "Aqua", style: { background: "linear-gradient(180deg,#8fc5d6,#3f7f95)" } },
];

export default function ClassicPage() {
  const { hubHttpUrl, messages } = useHub();
  const snd = useChime();

  const [view, setView] = useState<View>("desk");
  const [boot, setBoot] = useState<BootPhase>("done");
  const [vods, setVods] = useState<Stream[]>([]);
  const [selected, setSelected] = useState<Stream | null>(null);
  const [win, setWin] = useState<Record<WinKey, boolean>>({ show: true, mkt: true, chat: true, news: false, poly: false, trash: false, patterns: false, about: false });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [clock, setClock] = useState("");
  const [pat, setPat] = useState(0);
  const [markets, setMarkets] = useState<{ name: string; ticker: string; price: number; changePct: number }[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ w: 1000, h: 640 });

  const toggle = (k: WinKey, on?: boolean) =>
    setWin((w) => {
      const next = on ?? !w[k];
      if (next && !w[k]) snd.open();
      else if (!next && w[k]) snd.close();
      return { ...w, [k]: next };
    });

  const enterWatch = () => {
    if (view === "watch") return;
    setView("watch");
    setBoot("flicker");
    snd.startup();
    setTimeout(() => setBoot("happy"), 480);
    setTimeout(() => setBoot("done"), 1400);
  };
  const exitWatch = () => { setOpenMenu(null); snd.close(); setView("desk"); };
  const restart = () => { setOpenMenu(null); setBoot("flicker"); snd.startup(); setTimeout(() => setBoot("happy"), 420); setTimeout(() => setBoot("done"), 1300); };

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("cls-mode");
    return () => document.documentElement.classList.remove("cls-mode");
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [openMenu]);

  useEffect(() => {
    const measure = () => { const el = screenRef.current; if (el) setBounds({ w: el.clientWidth, h: el.clientHeight }); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view, boot]);

  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    fetch(`${hubHttpUrl}/content`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const tw: Stream[] = (d.streams || []).filter((s: Stream) => (s as { source?: string }).source !== "kick" && twitchVodId(s.url));
        setVods(tw);
        setSelected((cur) => cur || tw[0] || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [hubHttpUrl]);

  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    const load = () =>
      fetch(`${hubHttpUrl}/markets`)
        .then((r) => r.json())
        .then((d) => { if (alive) setMarkets([...(d.equities || []), ...(d.crypto || [])].slice(0, 8)); })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [hubHttpUrl]);

  const heroMedia: Media | null = selected ? { kind: "vod", title: selected.title, url: selected.url, source: "twitch" } : null;
  const shadeSnd = (c: boolean) => (c ? snd.close() : snd.open());

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: "New Finder Window", disabled: true },
      { label: "Open", disabled: true },
      "---",
      { label: "Close Window", action: () => { setOpenMenu(null); const k = (["trash", "patterns", "about", "poly", "news", "chat", "mkt", "show"] as WinKey[]).find((x) => win[x]); if (k) toggle(k, false); } },
    ],
    Edit: [{ label: "Undo", disabled: true }, { label: "Cut", disabled: true }, { label: "Copy", disabled: true }, { label: "Paste", disabled: true }],
    View: [{ label: "by Icon", disabled: true }, { label: "by Name", disabled: true }, { label: "Desktop Patterns…", action: () => { setOpenMenu(null); toggle("patterns", true); } }],
    Special: [
      { label: "Clean Up Desktop", disabled: true },
      { label: "Empty Trash…", action: () => { setOpenMenu(null); snd.close(); toggle("trash", true); } },
      "---",
      { label: "Restart", action: restart },
      { label: "Back to Desk", action: exitWatch },
    ],
  };
  const appleMenu: MenuItem[] = [
    { label: "About Market Bubble…", action: () => { setOpenMenu(null); toggle("about", true); } },
    "---",
    { label: "The Show", action: () => { setOpenMenu(null); toggle("show", true); } },
    { label: "Chat", action: () => { setOpenMenu(null); toggle("chat", true); } },
    { label: "Markets", action: () => { setOpenMenu(null); toggle("mkt", true); } },
    { label: "News Wire", action: () => { setOpenMenu(null); toggle("news", true); } },
    { label: "Polymarket", action: () => { setOpenMenu(null); toggle("poly", true); } },
    "---",
    { label: "Desktop Patterns…", action: () => { setOpenMenu(null); toggle("patterns", true); } },
  ];

  const renderMenu = (items: MenuItem[]) => (
    <div className="dt-dropdown" onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it === "---" ? <div className="dt-dd-sep" key={i} /> : (
          <button key={i} className={`dt-dd-item ${it.disabled ? "off" : ""}`} disabled={it.disabled} onClick={() => { if (!it.disabled) { snd.click(); it.action?.(); } }}>{it.label}</button>
        )
      )}
    </div>
  );

  const dockItems: DockItem[] = [
    { key: "show", label: "The Show", glyph: GTv, open: win.show, onClick: () => toggle("show") },
    { key: "mkt", label: "Markets", glyph: GChart, open: win.mkt, onClick: () => toggle("mkt") },
    { key: "chat", label: "Chat", glyph: GChat, open: win.chat, onClick: () => toggle("chat") },
    { key: "news", label: "News Wire", glyph: GNews, open: win.news, onClick: () => toggle("news") },
    { key: "poly", label: "Polymarket", glyph: GPoly, open: win.poly, onClick: () => toggle("poly") },
    { key: "trash", label: "Trash", glyph: GTrash, open: win.trash, onClick: () => { snd.close(); toggle("trash"); } },
  ];

  return (
    <div className={`cls-scene view-${view}`}>
      {/* ============================ DESK (zoomed out) ============================ */}
      <div className="desk-cam">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mac-photo" src="/mac.png" alt="Macintosh" draggable={false} />
        <button className="desk-screen" onClick={enterWatch} aria-label="Watch Market Bubble">
          <div className="desk-preview">
            {selected?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="desk-thumb" src={selected.thumb} alt="" />
            ) : (
              <div className="desk-thumb desk-thumb-ph" />
            )}
            <div className="desk-scan" aria-hidden />
          </div>
          <div className="photo-glass" aria-hidden />
          <div className="watch-cta">
            <span className="watch-dot" />
            <span>Watch Market&nbsp;Bubble</span>
            <span className="watch-sub">click to enter ▸</span>
          </div>
        </button>
      </div>

      {/* ====================== WATCH (zoomed in, full desktop) ===================== */}
      <div className="watch-layer" aria-hidden={view !== "watch"}>
        <div className="watch-crt" ref={screenRef}>
          {boot !== "done" ? (
            <div className="boot">
              {boot === "flicker" && <span className="crt-on" aria-hidden />}
              {boot === "happy" && (
                <div className="boot-welcome"><HappyMac /><span>Welcome to Market&nbsp;Bubble</span></div>
              )}
            </div>
          ) : (
            <div className="dt" style={PATTERNS[pat].style}>
              {/* menu bar */}
              <div className="dt-menubar">
                <button className={`dt-apple ${openMenu === "apple" ? "on" : ""}`} onPointerDown={(e) => { e.stopPropagation(); setOpenMenu((m) => (m === "apple" ? null : "apple")); }}>
                  <RainbowApple size={11} />
                  {openMenu === "apple" && renderMenu(appleMenu)}
                </button>
                {Object.keys(menus).map((name) => (
                  <button key={name} className={`dt-menu ${openMenu === name ? "on" : ""}`} onPointerDown={(e) => { e.stopPropagation(); setOpenMenu((m) => (m === name ? null : name)); }} onPointerEnter={() => openMenu && openMenu !== name && setOpenMenu(name)}>
                    {name}
                    {openMenu === name && renderMenu(menus[name])}
                  </button>
                ))}
                <span className="dt-menu-spacer" />
                <button className="dt-eject" onPointerDown={(e) => { e.stopPropagation(); exitWatch(); }} title="Back to desk">⤺ Desk</button>
                <span className="dt-clock">{clock}</span>
              </div>

              {/* desktop icons */}
              <div className="dt-icons">
                <button className="dt-icon" onClick={() => toggle("show", true)} title="The Show"><span className="dt-icon-glyph dt-glyph-hd" /><span className="dt-icon-label">Market Bubble</span></button>
                <button className="dt-icon" onClick={() => toggle("news", true)} title="News"><span className="dt-icon-glyph dt-glyph-doc" /><span className="dt-icon-label">News Wire</span></button>
                <button className="dt-icon dt-trash" onClick={() => { snd.close(); toggle("trash", true); }} title="Trash"><span className="dt-icon-glyph dt-glyph-trash" /><span className="dt-icon-label">Trash</span></button>
              </div>

              {win.show && (
                <MacWindow title="The Show" initial={{ x: 44, y: 46 }} width={560} bounds={bounds} onClose={() => toggle("show", false)} onShade={shadeSnd}>
                  <div className="show-win">
                    <div className="show-video">{heroMedia ? <MediaPlayer media={heroMedia} muted /> : <div className="show-loading">Inserting disk…</div>}</div>
                    <div className="show-meta"><span className="show-badge">▶ REPLAY</span><span className="show-title">{heroMedia?.title || "Market Bubble"}</span></div>
                    {vods.length > 1 && (
                      <div className="show-rail">
                        {vods.slice(0, 6).map((v, i) => (
                          <button key={i} className={`show-chip ${selected?.url === v.url ? "on" : ""}`} onClick={() => { snd.click(); setSelected(v); }} title={v.title}>{v.title}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </MacWindow>
              )}

              {win.mkt && (
                <MacWindow title="Markets" initial={{ x: 640, y: 46 }} width={250} bounds={bounds} onClose={() => toggle("mkt", false)} onShade={shadeSnd}>
                  <div className="mkt-win">
                    {markets.length === 0 && <div className="mkt-row mkt-empty">Reading tape…</div>}
                    {markets.map((m) => (
                      <div className="mkt-row" key={m.ticker}>
                        <span className="mkt-tk">{m.ticker}</span>
                        <span className="mkt-px">{m.price < 10 ? m.price.toFixed(3) : m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className={`mkt-ch ${m.changePct >= 0 ? "up" : "down"}`}>{m.changePct >= 0 ? "▲" : "▼"} {Math.abs(m.changePct).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </MacWindow>
              )}

              {win.chat && (
                <MacWindow title="Chat" initial={{ x: 640, y: 332 }} width={300} bounds={bounds} onClose={() => toggle("chat", false)} onShade={shadeSnd}>
                  <ChatWindow live={messages} onSay={() => snd.click()} />
                </MacWindow>
              )}

              {win.news && (
                <MacWindow title="News Wire" initial={{ x: 96, y: 120 }} width={420} height={280} resizable bounds={bounds} onClose={() => toggle("news", false)} onShade={shadeSnd}>
                  <NewsWindow />
                </MacWindow>
              )}

              {win.poly && (
                <MacWindow title="Polymarket" initial={{ x: 150, y: 160 }} width={420} height={280} resizable bounds={bounds} onClose={() => toggle("poly", false)} onShade={shadeSnd}>
                  <PolymarketWindow />
                </MacWindow>
              )}

              {win.patterns && (
                <MacWindow title="Desktop Patterns" initial={{ x: 130, y: 120 }} width={210} bounds={bounds} onClose={() => toggle("patterns", false)} onShade={shadeSnd}>
                  <div className="pat-win">
                    <div className="pat-preview" style={PATTERNS[pat].style} />
                    <div className="pat-grid">
                      {PATTERNS.map((p, i) => (
                        <button key={p.key} className={`pat-sw ${i === pat ? "on" : ""}`} style={p.style} title={p.label} onClick={() => { snd.click(); setPat(i); }} />
                      ))}
                    </div>
                    <div className="pat-name">{PATTERNS[pat].label}</div>
                  </div>
                </MacWindow>
              )}

              {win.trash && (
                <MacWindow title="Trash" initial={{ x: 320, y: 240 }} width={210} bounds={bounds} onClose={() => toggle("trash", false)} onShade={shadeSnd}>
                  <div className="trash-win">
                    <span className="trash-glyph">{GTrash}</span>
                    <div className="trash-msg">The Trash is empty.</div>
                    <div className="trash-sub">0 items · zero K used</div>
                  </div>
                </MacWindow>
              )}

              {win.about && (
                <MacWindow title="About Market Bubble" initial={{ x: 220, y: 150 }} width={320} bounds={bounds} onClose={() => toggle("about", false)} onShade={shadeSnd}>
                  <div className="about-win">
                    <div className="about-head">
                      <RainbowApple size={26} />
                      <div><div className="about-title">Market&nbsp;Bubble</div><div className="about-sub">System Software 6.0.8</div></div>
                    </div>
                    <div className="about-rows">
                      <div><span>Built with</span><b>Claude Code</b></div>
                      <div><span>Total Memory</span><b>4,096K</b></div>
                      <div><span>Live tickers</span><b>{markets.length}</b></div>
                      <div><span>Hosts</span><b>Banks · Ansem</b></div>
                    </div>
                    <div className="about-foot">Not just a platform. It&rsquo;s what&rsquo;s next.</div>
                  </div>
                </MacWindow>
              )}

              <Dock items={dockItems} />
            </div>
          )}
          <div className="watch-glass" aria-hidden />
        </div>
      </div>
    </div>
  );
}
