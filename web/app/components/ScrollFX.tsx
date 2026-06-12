"use client";

import { useEffect } from "react";

// Scroll-driven motion for the lobby, print-shop flavored:
//  - [data-rv]        elements "letterpress-stamp" in when they enter the viewport
//                     (opacity + tiny settle, staggered via data-rv="1..n")
//  - [data-rv-rule]   hairline rules draw themselves left→right on entry
//  - [data-prlx]      gentle parallax drift; the attribute value is the factor
//                     (e.g. "0.06" — positive lags the scroll, negative leads)
// All transform/opacity only; disabled under prefers-reduced-motion.
// Experiment-local styles (kept out of globals.css while this is a playground).
const FX_CSS = `
[data-rv] {
  opacity: 0;
  transform: translate3d(0, 22px, 0);
  transition:
    opacity 0.34s cubic-bezier(0.2, 0.9, 0.3, 1),
    transform 0.42s cubic-bezier(0.2, 0.9, 0.3, 1);
  transition-delay: calc((var(--rvn, 1) - 1) * 45ms);
  will-change: opacity, transform;
}
[data-rv].rv-in { opacity: 1; transform: translate3d(0, 0, 0); }
[data-rv="1"]{--rvn:1}[data-rv="2"]{--rvn:2}[data-rv="3"]{--rvn:3}[data-rv="4"]{--rvn:4}
[data-rv="5"]{--rvn:5}[data-rv="6"]{--rvn:6}[data-rv="7"]{--rvn:7}[data-rv="8"]{--rvn:8}
[data-rv="9"]{--rvn:9}[data-rv="10"]{--rvn:10}[data-rv="11"]{--rvn:11}[data-rv="12"]{--rvn:12}
[data-rv-rule] {
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) 0.1s;
}
[data-rv-rule].rv-in, .rv-in [data-rv-rule] { transform: scaleX(1); }
@media (prefers-reduced-motion: reduce) {
  [data-rv], [data-rv-rule] { opacity: 1; transform: none; transition: none; }
}
`;

export function ScrollFX() {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.scrollfx = "";
    style.textContent = FX_CSS;
    document.head.appendChild(style);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll<HTMLElement>("[data-rv],[data-rv-rule]").forEach((el) =>
        el.classList.add("rv-in")
      );
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("rv-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll("[data-rv],[data-rv-rule]").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    };
    scan();
    // The lobby re-renders as hub data arrives (vods rail, hosts) — keep watching
    // for new reveal targets so late-mounted elements still animate in.
    const mo = new MutationObserver(() => {
      scan();
      measure(); // parallax anchors move when content above them mounts
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Parallax: one rAF loop, transforms only, no layout reads inside the frame
    // (rects are re-measured on resize, not per frame).
    type P = { el: HTMLElement; f: number; mid: number };
    let items: P[] = [];
    const measure = () => {
      items = Array.from(document.querySelectorAll<HTMLElement>("[data-prlx]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, f: parseFloat(el.dataset.prlx || "0.05"), mid: r.top + window.scrollY + r.height / 2 };
      });
    };
    measure();
    window.addEventListener("resize", measure);

    let raf = 0;
    let last = -1;
    const tick = () => {
      const y = window.scrollY;
      if (y !== last) {
        last = y;
        const vh2 = window.innerHeight / 2;
        for (const it of items) {
          const delta = it.mid - y - vh2; // px from viewport center
          it.el.style.transform = `translate3d(0, ${(delta * -it.f).toFixed(1)}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      style.remove();
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return null;
}
