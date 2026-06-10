"use client";

import React from "react";
// ============================================================================
// Market Bubble Macintosh — screensaver ("After Hours")
// Kicks in when the machine is idle: flying Market Bubble marks in retro
// rainbow stripes — like the era's Apple logo — drifting across the void.
// Any input wakes it.
// ============================================================================

function Screensaver({ onWake }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const W = host.clientWidth || 800;
    const H = host.clientHeight || 600;
    const sprites = [];
    const N = 14;
    for (let i = 0; i < N; i++) {
      const el = document.createElement("span");
      el.className = "saver-sprite";
      const size = 38 + Math.random() * 72;
      el.style.width = size + "px";
      el.style.height = "auto";
      const m = document.createElement("i");
      m.className = "mb-mark-fly";
      el.appendChild(m);
      host.appendChild(el);
      sprites.push({
        el,
        x: Math.random() * (W + 200) - 100,
        y: Math.random() * (H + 200) - 100,
        v: 0.4 + Math.random() * 1.2,
        bob: Math.random() * Math.PI * 2,
        size,
      });
    }
    let raf;
    let t = 0;
    const loop = () => {
      t += 0.016;
      for (const s of sprites) {
        s.x -= s.v;
        s.y += s.v * 0.55;
        if (s.x < -120 || s.y > H + 120) {
          s.x = W + Math.random() * 160;
          s.y = -120 - Math.random() * (H * 0.5);
        }
        const bobY = Math.sin(t * 2 + s.bob) * 5;
        s.el.style.transform = `translate(${s.x}px, ${s.y + bobY}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      sprites.forEach((s) => s.el.remove());
    };
  }, []);

  return (
    <div
      className="saver"
      ref={ref}
      onPointerDown={onWake}
      onPointerMove={onWake}
    >
      <span className="saver-cap">AFTER HOURS — move the mouse to rejoin the market</span>
    </div>
  );
}


export { Screensaver };
