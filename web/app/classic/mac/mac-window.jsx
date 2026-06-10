"use client";

import React from "react";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — MacWindow
// Authentic System-6 window: striped title bar with close box, drag to move,
// double-click the bar to window-shade, optional resize corner. The parent
// owns position/z (so the desktop can persist + clamp them).
// ============================================================================

function MacWindow({
  title,
  x,
  y,
  z = 1,
  width = 300,
  height,            // optional fixed content height (scrolls inside)
  resizable = false,
  bounds,            // {w,h} of the desktop
  onMove,
  onClose,
  onFocus,
  children,
  bodyClass = "",
  noPad = false,
}) {
  const [shaded, setShaded] = React.useState(false);
  const [size, setSize] = React.useState({ w: width, h: height });
  const winRef = React.useRef(null);
  const drag = React.useRef(null);

  const clampPos = (nx, ny) => {
    const el = winRef.current;
    const ww = el ? el.offsetWidth : size.w;
    return {
      x: Math.min(Math.max(0, nx), Math.max(0, (bounds?.w || 9999) - ww)),
      y: Math.min(Math.max(0, ny), Math.max(24, (bounds?.h || 9999) - 30)),
    };
  };

  const onBarDown = (e) => {
    if (e.target.closest(".mw-close")) return;
    onFocus && onFocus();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y, moved: false };
    const move = (ev) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
      const p = clampPos(d.ox + dx, d.oy + dy);
      onMove && onMove(p.x, p.y);
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onResizeDown = (e) => {
    e.stopPropagation();
    onFocus && onFocus();
    const start = { sx: e.clientX, sy: e.clientY, w: size.w, h: size.h || 200 };
    const move = (ev) => {
      setSize({
        w: Math.max(180, start.w + ev.clientX - start.sx),
        h: Math.max(110, start.h + ev.clientY - start.sy),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={winRef}
      className={`mw${shaded ? " shaded" : ""}`}
      style={{ left: x, top: y, zIndex: z, width: size.w }}
      onPointerDown={() => onFocus && onFocus()}
    >
      <div
        className="mw-bar"
        onPointerDown={onBarDown}
        onDoubleClick={() => {
          MacSound && (shaded ? MacSound.open() : MacSound.close());
          setShaded((s) => !s);
        }}
      >
        <button
          className="mw-close"
          aria-label={`Close ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose && onClose();
          }}
        ></button>
        <span className="mw-stripes" aria-hidden="true"></span>
        <span className="mw-title">{title}</span>
      </div>
      {!shaded && (
        <div
          className={`mw-body ${bodyClass}${noPad ? " nopad" : ""}`}
          style={size.h ? { height: size.h, overflowY: "auto" } : undefined}
        >
          {children}
          {resizable && <span className="mw-resize" onPointerDown={onResizeDown} aria-hidden="true"></span>}
        </div>
      )}
    </div>
  );
}

// Modal dialog (system alerts: the bomb, margin call). Centered, hard shadow.
function MacDialog({ icon, title, sub, button = "OK", onClose, danger = false }) {
  return (
    <div className="mdlg-scrim">
      <div className={`mdlg${danger ? " danger" : ""}`}>
        {icon && <span className="mdlg-icon">{icon}</span>}
        <div className="mdlg-text">
          <div className="mdlg-title">{title}</div>
          {sub && <div className="mdlg-sub">{sub}</div>}
        </div>
        <button
          className="mdlg-btn"
          onClick={() => {
            MacSound && MacSound.click();
            onClose && onClose();
          }}
        >
          {button}
        </button>
      </div>
    </div>
  );
}


export { MacWindow, MacDialog };
