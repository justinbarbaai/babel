"use client";

import { useEffect } from "react";

// Interactive elements that should "attract" to the cursor. Curated to tappable
// controls so nothing essential (panels, knobs, sliders) gets hijacked.
const SELECTOR = [
  ".btn",
  ".term-auth",
  ".watch-pushpill",
  ".term-switch-pill",
  ".reader-composer button",
  ".action",
  ".mkt-card",
  ".term-nav a",
  ".reader-tab",
  ".cin-chip",
].join(",");

/**
 * Magnetic elements: as the cursor nears a control it eases toward the pointer
 * and lifts slightly, then settles back when you leave. No persistent overlay —
 * the polish lives in how things respond, not in a thing that follows you.
 * Delegated listeners so it covers elements added after navigation. Off on touch.
 */
export function MagneticFX() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let current: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      if (!current) return;
      const r = current.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const f = 0.3; // pull strength (fraction of distance from center)
      const maxX = Math.min(16, r.width * 0.45);
      const maxY = Math.min(16, r.height * 0.7);
      const tx = Math.max(-maxX, Math.min(maxX, dx * f));
      const ty = Math.max(-maxY, Math.min(maxY, dy * f));
      current.style.setProperty("--mag-x", `${tx.toFixed(2)}px`);
      current.style.setProperty("--mag-y", `${ty.toFixed(2)}px`);
    };

    const release = (el: HTMLElement) => {
      el.style.setProperty("--mag-x", "0px");
      el.style.setProperty("--mag-y", "0px");
      setTimeout(() => {
        if (el === current) return; // re-entered before settle
        el.classList.remove("mag-active");
        el.style.removeProperty("--mag-x");
        el.style.removeProperty("--mag-y");
      }, 220);
    };

    const onOver = (e: PointerEvent) => {
      const t = (e.target as HTMLElement)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!t || t === current) return;
      if (current) release(current);
      current = t;
      t.classList.add("mag-active");
    };

    const onOut = (e: PointerEvent) => {
      if (!current) return;
      const to = e.relatedTarget as HTMLElement | null;
      if (to && current.contains(to)) return; // still inside
      const leaving = current;
      current = null;
      release(leaving);
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}
