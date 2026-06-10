"use client";

import { useEffect, useRef, useState } from "react";
import { ChatFeed } from "./ChatFeed";
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
  fromRect,
  getReturnRect,
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
  const [render, setRender] = useState(false);
  const [vis, setVis] = useState(false);
  const [layout, setLayout] = useState<Layout>("rail");
  const [idle, setIdle] = useState(false);
  // the two slide-out panels — remembered across opens
  const [chatOpen, setChatOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(true);
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
      const p = localStorage.getItem("mb.cinPanels");
      if (p) {
        const j = JSON.parse(p);
        if (typeof j.chat === "boolean") setChatOpen(j.chat);
        if (typeof j.views === "boolean") setViewsOpen(j.views);
      }
    } catch {}
  }, []);
  const togglePanel = (which: "chat" | "views") => {
    const next = { chat: which === "chat" ? !chatOpen : chatOpen, views: which === "views" ? !viewsOpen : viewsOpen };
    setChatOpen(next.chat);
    setViewsOpen(next.views);
    try { localStorage.setItem("mb.cinPanels", JSON.stringify(next)); } catch {}
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
          gridTemplateColumns:
            chatOpen || viewsOpen ? "minmax(0, 1fr) clamp(300px, 26vw, 400px)" : "minmax(0, 1fr)",
          gridTemplateRows: "auto minmax(0, 1fr)",
        }
      : undefined;

  const total = (viewers?.totals?.total ?? 0) + (viewers?.xLive?.live ? viewers.xLive.viewers : 0);

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
        {selected ? (
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
        </div>

        <div className={`cin-views cin-el ${viewsOpen ? "show" : ""}`}>
          <CinemaViews viewers={viewers} streams={streams} selected={selected} onSelect={onSelect} />
        </div>

        {/* slide-out handles — one pull each, no scenes to cycle */}
        <button
          className={`cin-handle cin-handle-chat ${chatOpen ? "open" : ""}`}
          onClick={() => togglePanel("chat")}
          aria-pressed={chatOpen}
          title={chatOpen ? "Hide chat (C)" : "Show chat (C)"}
        >
          <ChatGlyph />
          <span className="cin-handle-chev">{chatOpen ? "›" : "‹"}</span>
        </button>
        <button
          className={`cin-handle cin-handle-views ${viewsOpen ? "open" : ""}`}
          onClick={() => togglePanel("views")}
          aria-pressed={viewsOpen}
          title={viewsOpen ? "Hide live views (V)" : "Show live views (V)"}
        >
          <EyeGlyph />
          <span className="cin-handle-count">{total.toLocaleString()}</span>
        </button>

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
function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v3a2 2 0 0 1-2 2H4M20 8h-3a2 2 0 0 1-2-2V3M15 21v-3a2 2 0 0 1 2-2h3M4 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
