"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "../lib/player";
import { embedSrc, sourceLabel } from "../lib/media";

// Floating, draggable mini-player. Lives in the root layout so it persists
// across page navigations and keeps playing (muted). Drag by the header.
export function MiniPlayer() {
  const { mini, miniCollapsed, closeMini, toggleMiniSize, play } = usePlayer();
  const [parent, setParent] = useState("");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => setParent(window.location.hostname), []);

  // Default position: bottom-right, once we know the viewport.
  useEffect(() => {
    if (mini && !pos && typeof window !== "undefined") {
      setPos({ x: window.innerWidth - 380, y: window.innerHeight - 280 });
    }
  }, [mini, pos]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".mini-btn")) return;
    const base = pos || { x: window.innerWidth - 380, y: window.innerHeight - 280 };
    dragRef.current = { dx: e.clientX - base.x, dy: e.clientY - base.y };
    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const w = 360;
      const x = Math.max(8, Math.min(ev.clientX - dragRef.current.dx, window.innerWidth - w - 8));
      const y = Math.max(8, Math.min(ev.clientY - dragRef.current.dy, window.innerHeight - 80));
      setPos({ x, y });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!mini || typeof document === "undefined") return null;

  const src = parent ? embedSrc(mini, { parent, autoplay: true, muted: true }) : null;
  const label = sourceLabel(mini.source);

  return createPortal(
    <div className={`mini ${miniCollapsed ? "collapsed" : ""}`} style={pos ? { left: pos.x, top: pos.y } : undefined}>
      <div className="mini-head" onPointerDown={onDown}>
        <span className="mini-title">{mini.title || `${label} stream`}</span>
        <span className="mini-actions">
          <button className="mini-btn" onClick={() => play(mini)} title="Expand" aria-label="Expand">
            ⤢
          </button>
          <button className="mini-btn" onClick={toggleMiniSize} title={miniCollapsed ? "Show" : "Hide"} aria-label="Collapse">
            {miniCollapsed ? "▢" : "—"}
          </button>
          <button className="mini-btn" onClick={closeMini} title="Close" aria-label="Close">
            ✕
          </button>
        </span>
      </div>
      {!miniCollapsed && (
        <div className="mini-stage">
          {src ? (
            <iframe
              title={mini.title}
              src={src}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <a className="mini-noembed" href={mini.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mini.thumb && <img src={mini.thumb} alt={mini.title} />}
              <span>Watch on {label} ↗</span>
            </a>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
