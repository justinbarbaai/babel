"use client";

import React from "react";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — BubblePaint (the MacPaint homage)
// 1-bit ink on paper, pencil / brush / dither-spray / eraser plus line & rect
// shape tools, three nib sizes, ten-deep undo, persists the canvas to
// localStorage so masterpieces survive a reboot.
// ============================================================================

function PaintApp() {
  const W = 372, H = 232;
  const wrapRef = React.useRef(null);
  const cvsRef = React.useRef(null);
  const [tool, setTool] = React.useState("pencil"); // pencil | brush | spray | eraser | line | rect
  const [nib, setNib] = React.useState(2); // 1 | 2 | 3
  const drawing = React.useRef(false);
  const last = React.useRef(null);
  const anchor = React.useRef(null); // shape-tool start point
  const snap = React.useRef(null); // canvas snapshot during shape drag
  const undoStack = React.useRef([]);

  React.useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    try {
      const saved = localStorage.getItem("mbmac.paint");
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = saved;
      }
    } catch (e) {}
  }, []);

  const save = () => {
    try { localStorage.setItem("mbmac.paint", cvsRef.current.toDataURL("image/png")); } catch (e) {}
  };

  const pushUndo = () => {
    const ctx = cvsRef.current.getContext("2d");
    undoStack.current.push(ctx.getImageData(0, 0, W, H));
    if (undoStack.current.length > 10) undoStack.current.shift();
  };
  const undo = () => {
    MacSound.click();
    const prev = undoStack.current.pop();
    if (!prev) return;
    cvsRef.current.getContext("2d").putImageData(prev, 0, 0);
    save();
  };

  const pos = (e) => {
    const r = cvsRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const dot = (ctx, x, y) => {
    const sizes = { pencil: [1, 2, 3], brush: [3, 5, 8], spray: [8, 12, 18], eraser: [6, 10, 16] };
    const s = sizes[tool][nib - 1];
    if (tool === "spray") {
      ctx.fillStyle = "#111";
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * s;
        ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1);
      }
      return;
    }
    ctx.fillStyle = tool === "eraser" ? "#fff" : "#111";
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const stroke = (e) => {
    const ctx = cvsRef.current.getContext("2d");
    const p = pos(e);
    const l = last.current || p;
    const dist = Math.hypot(p.x - l.x, p.y - l.y);
    const steps = Math.max(1, Math.ceil(dist / 1.5));
    for (let i = 0; i <= steps; i++) dot(ctx, l.x + ((p.x - l.x) * i) / steps, l.y + ((p.y - l.y) * i) / steps);
    last.current = p;
  };

  const lineWidthFor = () => ({ 1: 1.5, 2: 3, 3: 5 })[nib];
  const drawShape = (ctx, a, b) => {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = lineWidthFor();
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    } else {
      ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    ctx.stroke();
  };

  const down = (e) => {
    drawing.current = true;
    last.current = null;
    cvsRef.current.setPointerCapture(e.pointerId);
    pushUndo();
    if (tool === "line" || tool === "rect") {
      const ctx = cvsRef.current.getContext("2d");
      anchor.current = pos(e);
      snap.current = ctx.getImageData(0, 0, W, H);
      return;
    }
    stroke(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    if (tool === "line" || tool === "rect") {
      const ctx = cvsRef.current.getContext("2d");
      ctx.putImageData(snap.current, 0, 0);
      drawShape(ctx, anchor.current, pos(e));
      return;
    }
    stroke(e);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    anchor.current = null;
    snap.current = null;
    save();
  };

  const clear = () => {
    MacSound.click();
    pushUndo();
    const ctx = cvsRef.current.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    save();
  };

  const tools = [
    { k: "pencil", t: "Pencil", g: "✏" },
    { k: "brush", t: "Brush", g: "🖌" },
    { k: "spray", t: "Spray", g: "᠅" },
    { k: "eraser", t: "Eraser", g: "▭" },
    { k: "line", t: "Line", g: "╲" },
    { k: "rect", t: "Rectangle", g: "□" },
  ];

  return (
    <div className="paint">
      <div className="paint-tools">
        {tools.map((t) => (
          <button
            key={t.k}
            className={`paint-tool${tool === t.k ? " on" : ""}`}
            title={t.t}
            onClick={() => { MacSound.click(); setTool(t.k); }}
          >
            {t.g}
          </button>
        ))}
        <div className="paint-sizes">
          {[1, 2, 3].map((n) => (
            <button key={n} className={`paint-size${nib === n ? " on" : ""}`} title={`Size ${n}`} onClick={() => { MacSound.click(); setNib(n); }}>
              <i style={{ width: n * 3, height: n * 3 }}></i>
            </button>
          ))}
        </div>
        <button className="paint-tool" title="Undo" onClick={undo} style={{ marginTop: "auto" }}>↶</button>
        <button className="paint-tool" title="Clear" onClick={clear}>✕</button>
      </div>
      <div className="paint-canvaswrap" ref={wrapRef}>
        <canvas
          ref={cvsRef}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        ></canvas>
      </div>
    </div>
  );
}


export { PaintApp };
