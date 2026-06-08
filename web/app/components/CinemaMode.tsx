"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChatFeed } from "./ChatFeed";
import { MBLockup } from "./brand";
import { SourceLogo, type SourceKey } from "./logos";
import { DEMO_MODE, DEMO_VOD_ID } from "../lib/demo";
import type { ChatMessage, Profile } from "../lib/useHub";
import type { OverlayOptions } from "../lib/overlay";

type Stream = { source: Exclude<SourceKey, "x">; channel: string };
type Els = { stream: boolean; chat: boolean; views: boolean };
type Layout = "overlay" | "rail";
const SCENES: { key: string; label: string; els: Els }[] = [
  { key: "broadcast", label: "Broadcast", els: { stream: true, chat: true, views: true } },
  { key: "theater", label: "Theater", els: { stream: true, chat: false, views: false } },
  { key: "spotlight", label: "Spotlight", els: { stream: true, chat: false, views: true } },
];

type Props = {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  options: OverlayOptions;
  profiles: Record<string, Profile | null>;
  requestProfile: (source: string, login: string) => void;
  viewers: any;
  streams: Stream[];
  selected: Stream | null;
  onSelect: (s: Stream) => void;
  parent: string;
};

export function CinemaMode({
  open,
  onClose,
  messages,
  options,
  profiles,
  requestProfile,
  viewers,
  streams,
  selected,
  onSelect,
  parent,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [els, setEls] = useState<Els>(SCENES[0].els);
  const [render, setRender] = useState(false);
  const [vis, setVis] = useState(false);
  const [layout, setLayout] = useState<Layout>("rail");

  // remember the layout choice across opens
  useEffect(() => {
    try {
      const v = localStorage.getItem("mb.cinLayout");
      if (v === "overlay" || v === "rail") setLayout(v);
    } catch {}
  }, []);
  const chooseLayout = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem("mb.cinLayout", l);
    } catch {}
  };

  // mount with an enter animation; on close, play the exit before unmounting
  useEffect(() => {
    if (open) {
      setRender(true);
      const t = setTimeout(() => setVis(true), 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    const t = setTimeout(() => setRender(false), 360);
    return () => clearTimeout(t);
  }, [open]);

  const go = (d: number) => {
    const n = (idx + d + SCENES.length) % SCENES.length;
    setIdx(n);
    setEls(SCENES[n].els);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!render) return null;
  const scene = SCENES[idx];

  const railStyle =
    layout === "rail"
      ? {
          gridTemplateColumns:
            els.chat || els.views ? "minmax(0, 1fr) clamp(300px, 26vw, 400px)" : "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
        }
      : undefined;

  return (
    <div className={`cin ${vis ? "in" : ""}`} role="dialog" aria-modal="true">
      <div className="cin-stage" data-scene={scene.key} data-layout={layout} style={railStyle}>
        {els.stream && selected ? (
          <CinemaStream key={`${selected.source}:${selected.channel}`} selected={selected} parent={parent} />
        ) : (
          <div className="cin-stream cin-stream-off" />
        )}

        <div className={`cin-chat cin-el ${els.chat ? "show" : ""}`}>
          <ChatFeed
            messages={messages}
            options={options}
            profiles={profiles}
            onHoverUser={requestProfile}
            placeholder={<span>chat will appear here…</span>}
          />
        </div>

        <div className={`cin-views cin-el ${els.views ? "show" : ""}`}>
          <CinemaViews viewers={viewers} streams={streams} selected={selected} onSelect={onSelect} />
        </div>

        <div className="cin-brand">
          <MBLockup className="cin-brand-lockup" />
        </div>
      </div>

      <button className="cin-arrow left" onClick={() => go(-1)} aria-label="Previous scene">
        <Chevron dir="left" />
      </button>
      <button className="cin-arrow right" onClick={() => go(1)} aria-label="Next scene">
        <Chevron dir="right" />
      </button>

      <button className="cin-exit" onClick={onClose} aria-label="Exit cinema mode">
        <CollapseIcon /> <span>Exit</span>
      </button>

      <div className="cin-dock">
        <span className="cin-scene">
          {scene.label}
          <span className="cin-dots">
            {SCENES.map((_, i) => (
              <span key={i} className={`cin-dot ${i === idx ? "on" : ""}`} />
            ))}
          </span>
        </span>
        <span className="cin-dock-sep" />
        <Chip on={els.stream} onClick={() => setEls((e) => ({ ...e, stream: !e.stream }))}>Stream</Chip>
        <Chip on={els.chat} onClick={() => setEls((e) => ({ ...e, chat: !e.chat }))}>Chat</Chip>
        <Chip on={els.views} onClick={() => setEls((e) => ({ ...e, views: !e.views }))}>Views</Chip>
        <span className="cin-dock-sep" />
        <div className="cin-layouts" role="group" aria-label="Layout">
          <button className={`cin-lbtn ${layout === "overlay" ? "on" : ""}`} onClick={() => chooseLayout("overlay")}>
            Overlay
          </button>
          <button className={`cin-lbtn ${layout === "rail" ? "on" : ""}`} onClick={() => chooseLayout("rail")}>
            Rail
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={`cin-chip ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}>
      <span className="cin-chip-led" />
      {children}
    </button>
  );
}

/* ---- the cinema stream: own SDK player, unmuted (opened by a click), shielded
   so the cursor can't pause it, with a custom volume slider ---- */
function CinemaStream({ selected, parent }: { selected: Stream; parent: string }) {
  const src = DEMO_MODE
    ? // promo demo: roll the VOD in cinema as if it were the live feed
      `https://player.twitch.tv/?video=${DEMO_VOD_ID}&parent=${encodeURIComponent(parent)}&muted=true&autoplay=true`
    : selected.source === "twitch"
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(selected.channel)}&parent=${encodeURIComponent(parent)}&muted=true&autoplay=true`
      : `https://player.kick.com/${encodeURIComponent(selected.channel)}?muted=true&autoplay=true`;
  return (
    <div className="cin-stream">
      <iframe
        key={src}
        className="cin-video"
        src={src}
        title={`${selected.source} — ${selected.channel}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        frameBorder="0"
      />
      {/* partial shield: stops cursor/click pausing, leaves bottom controls open */}
      <div className="cin-shield" />
    </div>
  );
}

function CinemaViews({
  viewers,
  streams,
  selected,
  onSelect,
}: {
  viewers: any;
  streams: Stream[];
  selected: Stream | null;
  onSelect: (s: Stream) => void;
}) {
  const t = viewers?.totals ?? { total: 0, twitch: 0, kick: 0 };
  const xv = viewers?.xLive?.live ? viewers.xLive.viewers : 0;
  const total = t.total ?? 0;
  const denom = Math.max(1, (t.twitch ?? 0) + (t.kick ?? 0) + xv);
  const rows = [
    { label: "Twitch", cls: "tw", v: t.twitch ?? 0 },
    { label: "Kick", cls: "kk", v: t.kick ?? 0 },
    { label: "X", cls: "x", v: xv },
  ];
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="cin-views-card">
      {streams.length > 1 && (
        <div className="cin-tabs">
          {streams.map((s) => {
            const on = selected?.source === s.source && selected?.channel === s.channel;
            return (
              <button
                key={`${s.source}:${s.channel}`}
                className={`cin-tab ${on ? "on" : ""}`}
                data-source={s.source}
                onClick={() => onSelect(s)}
              >
                <SourceLogo source={s.source} size={11} /> {s.channel}
              </button>
            );
          })}
        </div>
      )}
      <div className="cin-views-head">Live audience</div>
      <div className="cin-views-num">{fmt(total)}</div>
      <div className="cin-views-rows">
        {rows.map((r) => (
          <div className="cin-vrow" key={r.label}>
            <span className={`cin-vrow-name ${r.cls}`}>{r.label}</span>
            <div className="cin-vrow-track">
              <span className={`cin-vrow-fill ${r.cls}`} style={{ width: `${Math.max(2, (r.v / denom) * 100)}%` }} />
            </div>
            <span className="cin-vrow-val">{fmt(r.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- icons ---- */
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v3a2 2 0 0 1-2 2H4M20 8h-3a2 2 0 0 1-2-2V3M15 21v-3a2 2 0 0 1 2-2h3M4 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}
function MuteIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm13.5 3 2.7-2.7-1.4-1.4L16 10.6 13.3 7.9 11.9 9.3 14.6 12l-2.7 2.7 1.4 1.4L16 13.4l2.7 2.7 1.4-1.4z" /></svg>;
}
function VolIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>;
}
