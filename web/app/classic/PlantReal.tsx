"use client";

import { useEffect, useRef, useState } from "react";

// Big background plant, photo-still at rest. The crown is sliced into frond
// GROUPS along computed gap angles (each cut ray crosses the least foliage
// possible). Brushing across actual leaf pixels (alpha-tested) pushes the
// fronds under the hand and they spring back — rigid rotations only, always
// crisp. Swing is kept small so the groups never visibly separate.

const WEDGES = 7;
const A_START = (-188 * Math.PI) / 180; // fan range around the root
const A_END = (8 * Math.PI) / 180;
// stem base, as a fraction of the image box (the CSS box aspect-ratio matches
// the asset exactly, so the box IS the image)
const ROOT_X = 0.5;
const ROOT_Y = 1.02;
const MAX_DEFLECT = 0.012; // rad ≈ 0.7° — enough to feel, too small to split

export function PlantReal() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    let raf = 0;
    let alive = true;
    const cleanupFns: (() => void)[] = [];

    const img = new Image();
    img.src = "/plant.png";
    img.onload = () => {
      if (!alive) return;
      const W = Math.round(img.naturalWidth / 2);
      const H = Math.round(img.naturalHeight / 2);
      const rootX = ROOT_X * W;
      const rootY = ROOT_Y * H;
      const span = (A_END - A_START) / WEDGES;

      // alpha map (hit-testing + choosing smart cut angles)
      const hit = document.createElement("canvas");
      hit.width = 256;
      hit.height = 256;
      const hg = hit.getContext("2d", { willReadFrequently: true })!;
      hg.drawImage(img, 0, 0, 256, 256);
      const hitData = hg.getImageData(0, 0, 256, 256).data;

      // cut along the GAPS between fronds: for each boundary, pick the
      // candidate angle whose ray from the root crosses the least foliage
      const foliageAlong = (ang: number) => {
        let s = 0;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        const R = Math.max(W, H) * 1.15;
        for (let t = 0.1; t <= 1; t += 0.018) {
          const x = (rootX + cos * t * R) / W;
          const y = (rootY + sin * t * R) / H;
          if (x < 0 || x >= 1 || y < 0 || y >= 1) continue;
          s += hitData[((Math.floor(y * 255) * 256) + Math.floor(x * 255)) * 4 + 3];
        }
        return s;
      };
      const bounds: number[] = [A_START];
      for (let k = 1; k < WEDGES; k++) {
        const target = A_START + k * span;
        let best = target, bestS = Infinity;
        for (let j = -14; j <= 14; j++) {
          const a = target + (j / 14) * span * 0.38;
          const s = foliageAlong(a);
          if (s < bestS) { bestS = s; best = a; }
        }
        bounds.push(best);
      }
      bounds.push(A_END);
      const centers = bounds.slice(0, -1).map((b, i) => (b + bounds[i + 1]) / 2);

      // hard-cut wedges along the gap angles (recompose pixel-perfectly)
      const slices: HTMLCanvasElement[] = [];
      for (let i = 0; i < WEDGES; i++) {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d")!;
        g.beginPath();
        g.moveTo(rootX, rootY);
        g.arc(rootX, rootY, W + H, bounds[i] - 0.002, bounds[i + 1] + 0.002);
        g.closePath();
        g.clip();
        g.drawImage(img, 0, 0, W, H);
        c.className = "plant-slice";
        box.appendChild(c);
        slices.push(c);
      }

      // spring state per wedge
      const theta = new Float64Array(WEDGES);
      const vel = new Float64Array(WEDGES);
      let lastX: number | null = null;
      let lastY = 0;
      let lastT = 0;

      // the CSS box has the asset's exact aspect-ratio, so the box IS the image
      const geom = () => box.getBoundingClientRect();

      // pivot all slices at the root point
      slices.forEach((c) => { c.style.transformOrigin = `${ROOT_X * 100}% ${ROOT_Y * 100}%`; });

      const onMove = (e: MouseEvent) => {
        const g0 = geom();
        const ix = (e.clientX - g0.left) / g0.width; // 0..1 in the image box
        const iy = (e.clientY - g0.top) / g0.height;
        const now = performance.now();
        const px = lastX, py = lastY, pt = lastT;
        lastX = e.clientX; lastY = e.clientY; lastT = now;
        if (ix < 0 || ix > 1 || iy < 0 || iy > 1) return;
        // only react when the cursor is ON leaf pixels
        const a = hitData[((Math.floor(iy * 255) * 256) + Math.floor(ix * 255)) * 4 + 3];
        if (a < 40 || px === null || now - pt > 120) return;
        // tangential push around the root, from cursor velocity
        const rx = ix - ROOT_X;
        const ry = iy - ROOT_Y;
        const vx = (e.clientX - px) / g0.width;
        const vy = (e.clientY - py) / g0.height;
        const push = (rx * vy - ry * vx) / Math.max(0.08, Math.hypot(rx, ry)); // signed swing
        const ang = Math.atan2(ry, rx);
        for (let i = 0; i < WEDGES; i++) {
          const d = (ang - centers[i]) / span; // distance in wedge-widths
          const fall = Math.exp(-d * d * 0.4); // very wide coupling — the crown
          // moves nearly as one around the brush, so cuts barely shear
          vel[i] += push * 0.5 * fall;
        }
      };
      window.addEventListener("mousemove", onMove);
      cleanupFns.push(() => window.removeEventListener("mousemove", onMove));

      const tick = () => {
        for (let i = 0; i < WEDGES; i++) {
          // damped spring back to rest — settles quickly once the hand leaves
          vel[i] = (vel[i] - theta[i] * 0.16) * 0.82;
          theta[i] += vel[i];
          if (theta[i] > MAX_DEFLECT) theta[i] = MAX_DEFLECT;
          if (theta[i] < -MAX_DEFLECT) theta[i] = -MAX_DEFLECT;
          const t = Math.abs(theta[i]) < 0.0004 ? 0 : theta[i];
          slices[i].style.transform = t === 0 ? "" : `rotate(${(t * 57.2958).toFixed(3)}deg)`;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    img.onerror = () => setOk(false);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cleanupFns.forEach((f) => f());
      box.querySelectorAll(".plant-slice").forEach((n) => n.remove());
    };
  }, [ok]);

  if (!ok) return null;

  return (
    /* clip window ends exactly at the desk-wall line — the plant hangs past
       it and gets cut off, like standing behind the desk */
    <div className="plant-clip" aria-hidden>
      <div className="plant-real" ref={boxRef} />
    </div>
  );
}
