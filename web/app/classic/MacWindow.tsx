"use client";

import { useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";

let zTop = 20;

/**
 * A System-style window: pinstripe title bar with a close box (left) and a
 * windowshade box (right). Drag by the bar; double-click the bar to roll it up
 * (classic WindowShade). Optionally resizable from a bottom-right grip.
 */
export function MacWindow({
  title,
  children,
  initial,
  width,
  height,
  minW = 150,
  minH = 110,
  resizable = false,
  onClose,
  onShade,
  bounds,
  className = "",
}: {
  title: string;
  children: ReactNode;
  initial: { x: number; y: number };
  width?: number;
  height?: number;
  minW?: number;
  minH?: number;
  resizable?: boolean;
  onClose?: () => void;
  onShade?: (collapsed: boolean) => void;
  bounds?: { w: number; h: number };
  className?: string;
}) {
  const [pos, setPos] = useState(initial);
  const [size, setSize] = useState<{ w?: number; h?: number }>({ w: width, h: height });
  const [collapsed, setCollapsed] = useState(false);
  const [z, setZ] = useState(() => ++zTop);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const rez = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
    x = Math.max(0, Math.min(x, (bounds?.w ?? 9999) - 40));
    y = Math.max(0, Math.min(y, (bounds?.h ?? 9999) - 24));
    setPos({ x, y });
  };
  const onUp = () => { drag.current = null; };

  const onRezDown = (e: RPointerEvent) => {
    e.stopPropagation();
    front();
    const el = (e.currentTarget as HTMLElement).closest(".mw") as HTMLElement;
    rez.current = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onRezMove = (e: RPointerEvent) => {
    if (!rez.current) return;
    const w = Math.max(minW, rez.current.w + (e.clientX - rez.current.x));
    const h = Math.max(minH, rez.current.h + (e.clientY - rez.current.y));
    setSize({ w, h });
  };
  const onRezUp = () => { rez.current = null; };

  const shade = () => setCollapsed((c) => { onShade?.(!c); return !c; });

  // when resized, the title bar (~20px) is part of the height; body fills the rest
  const bodyH = size.h ? size.h - 20 : undefined;

  return (
    <div
      className={`mw ${collapsed ? "is-collapsed" : ""} ${className}`}
      style={{ left: pos.x, top: pos.y, width: size.w, zIndex: z }}
      onPointerDown={front}
    >
      <div
        className="mw-bar"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={shade}
      >
        {onClose ? (
          <button className="mw-close" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Close" />
        ) : (
          <span className="mw-close mw-close-ghost" />
        )}
        <span className="mw-title">{title}</span>
        <button className="mw-shade" onClick={shade} onPointerDown={(e) => e.stopPropagation()} aria-label="Collapse" />
      </div>
      {!collapsed && (
        <div className="mw-body" style={{ height: bodyH }}>
          {children}
          {resizable && (
            <span
              className="mw-resize"
              onPointerDown={onRezDown}
              onPointerMove={onRezMove}
              onPointerUp={onRezUp}
              onPointerCancel={onRezUp}
              aria-hidden
            />
          )}
        </div>
      )}
    </div>
  );
}
