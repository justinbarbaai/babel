"use client";

import { useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";

// Shared z-order counter so clicking any window brings it to the front.
let zTop = 20;

/**
 * A System-6 style window: pinstripe title bar with a close box, draggable by
 * the bar. Positioned absolutely inside the Mac "screen" (no transform scaling,
 * so pointer deltas map 1:1 to left/top).
 */
export function MacWindow({
  title,
  children,
  initial,
  width,
  onClose,
  bounds,
  className = "",
}: {
  title: string;
  children: ReactNode;
  initial: { x: number; y: number };
  width?: number;
  onClose?: () => void;
  bounds?: { w: number; h: number };
  className?: string;
}) {
  const [pos, setPos] = useState(initial);
  const [z, setZ] = useState(() => ++zTop);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const front = () => setZ(++zTop);

  const onDown = (e: RPointerEvent) => {
    front();
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag.current) return;
    let x = e.clientX - drag.current.dx;
    let y = e.clientY - drag.current.dy;
    // keep the title bar reachable inside the screen
    const maxX = (bounds?.w ?? 9999) - 40;
    const maxY = (bounds?.h ?? 9999) - 24;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    setPos({ x, y });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div
      className={`mw ${className}`}
      style={{ left: pos.x, top: pos.y, width, zIndex: z }}
      onPointerDown={front}
    >
      <div
        className="mw-bar"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {onClose ? (
          <button
            className="mw-close"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close window"
          />
        ) : (
          <span className="mw-close mw-close-ghost" />
        )}
        <span className="mw-title">{title}</span>
        <span className="mw-grip" aria-hidden />
      </div>
      <div className="mw-body">{children}</div>
    </div>
  );
}
