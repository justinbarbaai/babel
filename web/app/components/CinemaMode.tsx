"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatFeed } from "./ChatFeed";
import { TwitchEmbed } from "./TwitchEmbed";
import { MBLockup } from "./brand";
import { SourceLogo, type SourceKey } from "./logos";
import { DEMO_MODE, DEMO_VOD_ID } from "../lib/demo";
import type { ChatMessage, Profile } from "../lib/useHub";
import type { OverlayOptions } from "../lib/overlay";

type Stream = { source: Exclude<SourceKey, "x">; channel: string };
type Layout = "overlay" | "rail";

type Props = {
  open: boolean;
  onClose: () => void;
  /** the workspace player's rect — the stage FLIPs out of this spot */
  fromRect?: DOMRect | null;
  /** re-measured on close so the stage can FLIP back home */
  getReturnRect?: () => DOMRect | null;
  /** the page's chat composer — same node as the workspace panel */
  composer?: ReactNode;
  messages: ChatMessage[];
  options: OverlayOptions;
  profiles: Record<string, Profile | null>;
  requestProfile: (source: string, login: string) => void;
  viewers: any;
  streams: Stream[];
  selected: Stream | null;
  onSelect: (s: Stream) => void;
  /** latest broadcast VOD — plays in the cinema whenever nothing is live */
  vod?: { id: string; title: string } | null;
  /** is any host actually live? off air, the cinema rolls the VOD instead of
      an offline channel embed */
  live?: boolean;
  parent: string;
};

export function CinemaMode({
  open,
  onClose,
  fromRect,
  getReturnRect,
  composer,
  messages,
  options,
  profiles,
  requestProfile,
  viewers,
  streams,
  selected,
  onSelect,
  vod = null,
  live = false,
  parent,
}: Props) {
  const [render, setRender] = useState(false);
  const [vis, setVis] = useState(false);
  const [layout, setLayout] = useState<Layout>("rail");
  const [idle, setIdle] = useState(false);
  // each face of the switch toggles its own panel — one, both, or none
  const [chatOpen, setChatOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // premium auto-hide: the controls melt away when the cursor rests
  useEffect(() => {
    if (!open) return;
    let t = window.setTimeout(() => setIdle(true), 2600);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), 2600);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [open]);

  // FLIP helper: the transform that maps the stage onto a given rect
  const flipTo = (target: DOMRect | null) => {
    const stage = stageRef.current;
    if (!stage || !target) return false;
    const s = stage.getBoundingClientRect();
    if (s.width < 2 || s.height < 2) return false;
    const tx = target.left + target.width / 2 - (s.left + s.width / 2);
    const ty = target.top + target.height / 2 - (s.top + s.height / 2);
    stage.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${(target.width / s.width).toFixed(4)}, ${(target.height / s.height).toFixed(4)})`;
    return true;
  };

  // remember the layout + panel choices across opens
  useEffect(() => {
    try {
      const v = localStorage.getItem("mb.cinLayout");
      if (v === "overlay" || v === "rail") setLayout(v);
      const p = localStorage.getItem("mb.cinPanel");
      if (p != null) {
        setChatOpen(p.includes("chat"));
        setViewsOpen(p.includes("views"));
      }
    } catch {}
  }, []);
  const togglePanel = (which: "chat" | "views") => {
    const nextChat = which === "chat" ? !chatOpen : chatOpen;
    const nextViews = which === "views" ? !viewsOpen : viewsOpen;
    setChatOpen(nextChat);
    setViewsOpen(nextViews);
    const keys = [nextChat && "chat", nextViews && "views"].filter(Boolean);
    try { localStorage.setItem("mb.cinPanel", keys.length ? keys.join("+") : "none"); } catch {}
  };
  const chooseLayout = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem("mb.cinLayout", l);
    } catch {}
  };

  // FLIP enter: the stage starts AT the workspace player's rect and expands to
  // the cinema position; exit reverses, flying home to the (re-measured) slot.
  useEffect(() => {
    if (open) {
      setRender(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const flipped = flipTo(fromRect ?? null);
          if (flipped && stageRef.current) {
            // pin the start frame, then release it so the transition runs
            void stageRef.current.getBoundingClientRect();
            requestAnimationFrame(() => {
              if (stageRef.current) stageRef.current.style.transform = "";
              setVis(true);
            });
          } else {
            setVis(true);
          }
        });
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    // exit: fly back into the workspace slot while the house lights come up
    flipTo(getReturnRect?.() ?? fromRect ?? null);
    setVis(false);
    const t = setTimeout(() => {
      setRender(false);
      if (stageRef.current) stageRef.current.style.transform = "";
    }, 500);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "c" || e.key === "C") togglePanel("chat");
      else if (e.key === "v" || e.key === "V") togglePanel("views");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, chatOpen, viewsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!render) return null;

  const railStyle =
    layout === "rail"
      ? {
          gridTemplateColumns: chatOpen ? "minmax(0, 1fr) clamp(300px, 26vw, 400px)" : "minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
        }
      : undefined;

  // concurrent viewers only (twitch + kick) — X impressions are a different
  // metric and live on their own chip in the strip
  const total = viewers?.totals?.total ?? 0;

  return (
    <div className={`cin ${vis ? "in" : ""} ${idle ? "idle" : ""}`} role="dialog" aria-modal="true">
      <div
        className="cin-stage"
        ref={stageRef}
        data-layout={layout}
        data-chat={chatOpen ? "1" : "0"}
        data-views={viewsOpen ? "1" : "0"}
        style={railStyle}
      >
        {selected && (live || DEMO_MODE) ? (
          <CinemaStream key={`${selected.source}:${selected.channel}`} selected={selected} parent={parent} />
        ) : vod ? (
          <CinemaVod key={vod.id} vod={vod} parent={parent} />
        ) : selected ? (
          <CinemaStream key={`${selected.source}:${selected.channel}`} selected={selected} parent={parent} />
        ) : (
          <div className="cin-stream cin-stream-off" />
        )}

        <div className={`cin-chat cin-el ${chatOpen ? "show" : ""}`}>
          <ChatFeed
            messages={messages}
            options={options}
            profiles={profiles}
            onHoverUser={requestProfile}
            placeholder={<span>chat will appear here…</span>}
          />
          {composer && <div className="cin-composer">{composer}</div>}
        </div>

        <div className={`cin-views cin-el ${viewsOpen ? "show" : ""}`}>
          <CinemaViews viewers={viewers} streams={streams} selected={selected} onSelect={onSelect} />
        </div>

        {/* one switch, two faces: chat and live views — each face toggles its
            own panel, so you can have either or both up */}
        <div className={`cin-switch ${chatOpen || viewsOpen ? "open" : ""}`} role="group" aria-label="Side panels">
          <button
            className={`cin-seg ${chatOpen ? "on" : ""}`}
            onClick={() => togglePanel("chat")}
            aria-pressed={chatOpen}
            title={chatOpen ? "Hide chat (C)" : "Show chat (C)"}
          >
            <ChatGlyph />
          </button>
          <button
            className={`cin-seg ${viewsOpen ? "on" : ""}`}
            onClick={() => togglePanel("views")}
            aria-pressed={viewsOpen}
            title={viewsOpen ? "Hide live views (V)" : "Show live views (V)"}
          >
            <EyeGlyph />
            <span className="cin-seg-count">{total.toLocaleString()}</span>
          </button>
        </div>

        <div className="cin-brand">
          <MBLockup className="cin-brand-lockup" />
        </div>
      </div>

      <button className="cin-exit" onClick={onClose} aria-label="Exit cinema mode">
        <CollapseIcon /> <span>Exit</span>
      </button>

      {/* the whole dock: two words */}
      <div className="cin-dock">
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

function ChatGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function EyeGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
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
    </div>
  );
}

/* off-air programming: the latest broadcast VOD rolls in the cinema until a
   host goes live (then `selected` fills in and the live feed takes over) */
function CinemaVod({ vod, parent }: { vod: { id: string; title: string }; parent: string }) {
  return (
    <div className="cin-stream">
      {/* Embed JS API: force-plays muted + resumes non-user pauses; clickable */}
      <TwitchEmbed video={vod.id} parent={parent} muted />
      <span className="cin-replay-tag">Replay · {vod.title}</span>
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
  const xIsLive = !!viewers?.xLive?.live;
  // X = live broadcast viewers from the X Bridge only; no impressions fallback.
  const xViews = xIsLive ? (viewers?.xLive?.viewers ?? 0) : 0;
  const total = t.total ?? 0;
  const rows = [
    { label: "Twitch", src: "twitch" as SourceKey, cls: "tw", v: t.twitch ?? 0, suffix: "" },
    { label: "Kick", src: "kick" as SourceKey, cls: "kk", v: t.kick ?? 0, suffix: "" },
    // X = live broadcast concurrent viewers (X Bridge), own metric
    { label: "X", src: "x" as SourceKey, cls: "x", v: xViews, suffix: xIsLive ? " live" : " views" },
  ];
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="cin-strip">
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
      <span className="cin-strip-live">
        <span className="cin-strip-dot" aria-hidden /> Live
      </span>
      <span className="cin-strip-total">{fmt(total)}</span>
      <span className="cin-strip-sep" aria-hidden />
      {rows.map((r) => (
        <span
          className={`cin-strip-src ${r.cls}`}
          key={r.label}
          title={r.suffix ? `${r.label} — post views (reach)` : `${r.label} viewers`}
        >
          <SourceLogo source={r.src} size={12} /> {fmt(r.v)}
          {r.suffix && <span className="cin-strip-suffix">{r.suffix}</span>}
        </span>
      ))}
    </div>
  );
}

/* ---- icons ---- */
function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v3a2 2 0 0 1-2 2H4M20 8h-3a2 2 0 0 1-2-2V3M15 21v-3a2 2 0 0 1 2-2h3M4 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
