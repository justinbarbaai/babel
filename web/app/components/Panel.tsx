"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Rect = { x: number; y: number; w: number; h: number; z: number };
type Box = { x: number; y: number; w: number; h: number };
type Bounds = { w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

// Borderless, draggable + resizable floating panel.
//
// Smoothness: a gesture only re-renders THIS panel (via local `live` state on an
// rAF), never the parent — so incoming chat doesn't fight the drag/resize. The
// panel follows the cursor freely while a faint "ghost" shows where it will snap;
// on release it lands on the snapped rect (grid + container/sibling edges).
export function Panel({
  title,
  rect,
  bounds,
  siblings = [],
  grid = 22,
  snap = 9,
  min = { w: 240, h: 160 },
  pad = true,
  rounded = true,
  headerRight,
  onChange,
  onFocus,
  onGuides,
  onGhost,
  children,
}: {
  title: string;
  rect: Rect;
  bounds: Bounds;
  siblings?: Box[];
  grid?: number;
  snap?: number;
  min?: { w: number; h: number };
  pad?: boolean;
  rounded?: boolean;
  headerRight?: ReactNode;
  onChange: (r: Rect) => void;
  onFocus: () => void;
  onGuides?: (x: number | null, y: number | null) => void;
  onGhost?: (b: Box | null) => void;
  children: ReactNode;
}) {
  const [live, setLive] = useState<Rect | null>(null);
  const raf = useRef(0);
  const pending = useRef<(() => void) | null>(null);

  const eff = live || rect;

  // Once the parent has committed our snapped rect, drop the local override.
  useEffect(() => {
    if (live && live.x === rect.x && live.y === rect.y && live.w === rect.w && live.h === rect.h) {
      setLive(null);
    }
  }, [rect, live]);

  const vlines = [0, bounds.w, bounds.w / 2, ...siblings.flatMap((s) => [s.x, s.x + s.w, s.x + s.w / 2])];
  const hlines = [0, bounds.h, bounds.h / 2, ...siblings.flatMap((s) => [s.y, s.y + s.h, s.y + s.h / 2])];

  const snapStart = (start: number, size: number, lines: number[]): [number, number | null] => {
    for (const [edge, off] of [
      [start, 0],
      [start + size, size],
      [start + size / 2, size / 2],
    ] as const) {
      for (const t of lines) if (Math.abs(edge - t) <= snap) return [t - off, t];
    }
    return [Math.round(start / grid) * grid, null];
  };
  const snapEnd = (origin: number, size: number, lines: number[]): [number, number | null] => {
    const end = origin + size;
    for (const t of lines) if (Math.abs(end - t) <= snap) return [t - origin, t];
    return [Math.round(size / grid) * grid, null];
  };

  const schedule = (fn: () => void) => {
    pending.current = fn;
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        pending.current?.();
      });
    }
  };
  const stopRaf = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  };

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".panel-nodrag")) return;
    e.preventDefault();
    onFocus();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = rect.x;
    const oy = rect.y;
    const w = rect.w;
    const h = rect.h;
    document.body.classList.add("panel-dragging");
    setLive({ ...rect });
    const move = (ev: PointerEvent) =>
      schedule(() => {
        const rawX = clamp(ox + (ev.clientX - sx), 0, Math.max(0, bounds.w - w));
        const rawY = clamp(oy + (ev.clientY - sy), 0, Math.max(0, bounds.h - h));
        setLive({ ...rect, x: rawX, y: rawY }); // panel follows cursor freely
        const [snX, gx] = snapStart(rawX, w, vlines);
        const [snY, gy] = snapStart(rawY, h, hlines);
        onGuides?.(gx, gy);
        onGhost?.({ x: clamp(snX, 0, bounds.w - w), y: clamp(snY, 0, bounds.h - h), w, h });
      });
    const up = (ev: PointerEvent) => {
      stopRaf();
      document.body.classList.remove("panel-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const rawX = clamp(ox + (ev.clientX - sx), 0, Math.max(0, bounds.w - w));
      const rawY = clamp(oy + (ev.clientY - sy), 0, Math.max(0, bounds.h - h));
      const x = clamp(snapStart(rawX, w, vlines)[0], 0, bounds.w - w);
      const y = clamp(snapStart(rawY, h, hlines)[0], 0, bounds.h - h);
      setLive({ ...rect, x, y });
      onChange({ ...rect, x, y });
      onGuides?.(null, null);
      onGhost?.(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    const sx = e.clientX;
    const sy = e.clientY;
    const ow = rect.w;
    const oh = rect.h;
    const x = rect.x;
    const y = rect.y;
    document.body.classList.add("panel-dragging");
    setLive({ ...rect });
    const move = (ev: PointerEvent) =>
      schedule(() => {
        const rawW = clamp(ow + (ev.clientX - sx), min.w, bounds.w - x);
        const rawH = clamp(oh + (ev.clientY - sy), min.h, bounds.h - y);
        setLive({ ...rect, w: rawW, h: rawH });
        const [snW, gx] = snapEnd(x, rawW, vlines);
        const [snH, gy] = snapEnd(y, rawH, hlines);
        onGuides?.(gx, gy);
        onGhost?.({ x, y, w: clamp(snW, min.w, bounds.w - x), h: clamp(snH, min.h, bounds.h - y) });
      });
    const up = (ev: PointerEvent) => {
      stopRaf();
      document.body.classList.remove("panel-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const rawW = clamp(ow + (ev.clientX - sx), min.w, bounds.w - x);
      const rawH = clamp(oh + (ev.clientY - sy), min.h, bounds.h - y);
      const w = clamp(snapEnd(x, rawW, vlines)[0], min.w, bounds.w - x);
      const h = clamp(snapEnd(y, rawH, hlines)[0], min.h, bounds.h - y);
      setLive({ ...rect, w, h });
      onChange({ ...rect, w, h });
      onGuides?.(null, null);
      onGhost?.(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className={`panel ${rounded ? "rounded" : ""} ${live ? "gesturing" : ""}`}
      style={{ left: eff.x, top: eff.y, width: eff.w, height: eff.h, zIndex: eff.z }}
      onPointerDown={onFocus}
    >
      <div className={`panel-body ${pad ? "" : "bare"}`}>{children}</div>
      <div className="panel-head" onPointerDown={startDrag}>
        <span className="panel-grip" aria-hidden>
          <i /><i /><i /><i /><i /><i />
        </span>
        <span className="panel-title">{title}</span>
        {headerRight && <span className="panel-head-right panel-nodrag">{headerRight}</span>}
      </div>
      <span className="panel-resize" onPointerDown={startResize} aria-label="Resize" />
    </div>
  );
}
