"use client";

import { useEffect, useRef, useState } from "react";

/* Interactive desk props, all positioned in % of the photo box.
   Lamp — click toggles: warm glow + light pool + dust motes vs dark.
   Mug — MB icon printed on the ceramic, steam wisps, sip on click.
   Cat — breathing; petting it (cursor rubs) purrs.
   Polaroids — Banks & Ansem taped to the wall, click to flip.
   CanvasPainting — blank canvas you can actually paint; strokes persist. */

export function Lamp({ onToggle }: { onToggle: (on: boolean) => void }) {
  const [on, setOn] = useState(true);
  return (
    <button
      className={`prop-lamp ${on ? "is-on" : "is-off"}`}
      aria-label={on ? "Turn lamp off" : "Turn lamp on"}
      title={on ? "lights out" : "lights on"}
      onClick={() => { const next = !on; setOn(next); onToggle(next); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/lamp.png" alt="" draggable={false} />
      <span className="lamp-pool" aria-hidden />
      <span className="lamp-motes" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
      </span>
    </button>
  );
}

export function Mug({ onSip }: { onSip: () => void }) {
  const [tilt, setTilt] = useState(false);
  return (
    <button
      className={`prop-mug ${tilt ? "is-sip" : ""}`}
      aria-label="Coffee"
      title="sip"
      onClick={() => { onSip(); setTilt(true); window.setTimeout(() => setTilt(false), 420); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mug.png" alt="" draggable={false} />
      <span className="mug-brand" aria-hidden />
      <span className="mug-steam" aria-hidden><i /><i /><i /></span>
    </button>
  );
}

export function Cat({ purr }: { purr: () => () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const idleTimer = useRef<number>(0);
  const lastX = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top + r.height * 0.15 && e.clientY < r.bottom;
      if (!inside) { lastX.current = null; return; }
      const moved = lastX.current !== null && Math.abs(e.clientX - lastX.current) > 2;
      lastX.current = e.clientX;
      if (!moved) return;
      // petting: start the purr, keep it alive while strokes continue
      if (!stopRef.current) stopRef.current = purr();
      el.classList.add("is-pet");
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        stopRef.current?.();
        stopRef.current = null;
        el.classList.remove("is-pet");
      }, 700);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.clearTimeout(idleTimer.current);
      stopRef.current?.();
    };
  }, [purr]);

  return (
    <div className="prop-cat" ref={ref} title="pet the cat" aria-label="Sleeping cat">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/cat.png" alt="" draggable={false} />
    </div>
  );
}

const HOSTS = [
  { handle: "Banks", name: "BANKS", note: "buy high sell low" },
  { handle: "blknoiz06", name: "ANSEM", note: "wagmi" },
];

export function Polaroids() {
  const [flipped, setFlipped] = useState<[boolean, boolean]>([false, false]);
  return (
    <div className="polaroids" aria-label="Photos on the wall">
      {HOSTS.map((h, i) => (
        <button
          key={h.handle}
          className={`polaroid ${flipped[i] ? "is-flipped" : ""}`}
          style={{ transform: `rotate(${i === 0 ? -4 : 3}deg)` }}
          onClick={() => setFlipped((f) => (i === 0 ? [!f[0], f[1]] : [f[0], !f[1]]))}
          title="flip"
        >
          <span className="polaroid-inner">
            <span className="polaroid-front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://unavatar.io/twitter/${h.handle}`} alt={h.name} draggable={false} />
              <span className="polaroid-label">{h.name}</span>
            </span>
            <span className="polaroid-back">
              <span>{h.note}</span>
            </span>
          </span>
          <span className="polaroid-tape" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function CanvasPainting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = 560;
    c.height = 380;
    const g = c.getContext("2d")!;
    // restore the saved artwork
    try {
      const saved = localStorage.getItem("mb.canvas");
      if (saved) {
        const img = new Image();
        img.onload = () => g.drawImage(img, 0, 0);
        img.src = saved;
      }
    } catch {}
  }, []);

  const pt = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const stroke = (e: React.PointerEvent) => {
    const c = canvasRef.current;
    if (!c || !drawing.current) return;
    const g = c.getContext("2d")!;
    const p = pt(e);
    g.strokeStyle = "rgba(46, 38, 60, 0.85)"; // dark plum oil paint
    g.lineWidth = 5;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo((last.current ?? p).x, (last.current ?? p).y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    try { localStorage.setItem("mb.canvas", c.toDataURL("image/png")); } catch {}
  };

  return (
    <div className="painting" aria-label="Paint on the canvas" title="paint on it">
      <canvas
        ref={canvasRef}
        className="painting-canvas"
        onPointerDown={(e) => { drawing.current = true; last.current = null; (e.target as HTMLElement).setPointerCapture(e.pointerId); stroke(e); }}
        onPointerMove={stroke}
        onPointerUp={() => { drawing.current = false; last.current = null; save(); }}
        onPointerLeave={() => { if (drawing.current) { drawing.current = false; last.current = null; save(); } }}
      />
      <span className="painting-grain" aria-hidden />
      <span className="painting-plaque" aria-hidden>MARKET BUBBLE</span>
    </div>
  );
}
