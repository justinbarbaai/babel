"use client";

import { useEffect } from "react";

// The "premium feel" layer — one component, one injected stylesheet, mounted
// once in the root layout.
//
//  1. Hover micro-interactions: cards lift 2px, hairline brightens, thumbs zoom
//     ~3%; buttons physically press on click. Transform/opacity only.
//  2. Image discipline: lazy images fade in over 250ms instead of popping.
//  3. Invisible details: brand selection color, focus rings, thin scrollbars.
//  4. Steady terminal digits (tabular-nums) on every live number.
//  5. Edition reader extras: drop cap, reading-progress rule, colophon.
//  6. Dark-mode lamplight vignette; reserved media space (no layout shift).
//  7. Route warming on link hover; live favicon + "● LIVE" tab title when
//     <html data-live="1">.
const PFX_CSS = `
/* ---- 1. hover micro-interactions ---- */
.oa-rail-card, .wire-story, .wire-lead, .wire-latest,
.cnt-strip-card, .cnt-lead, .mkt-card, .oa-host, .cnt-host {
  transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1),
              border-color 0.22s, box-shadow 0.22s;
}
.oa-rail-card:hover, .wire-story:hover, .wire-lead:hover, .wire-latest:hover,
.cnt-strip-card:hover, .cnt-lead:hover, .mkt-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-2);
}
.oa-rail-card:active, .wire-story:active, .wire-lead:active, .wire-latest:active,
.cnt-strip-card:active, .cnt-lead:active {
  transform: translateY(0) scale(0.995);
  transition-duration: 0.08s;
}
/* thumbnails zoom a hair inside their crop on hover */
.cnt-thumb { overflow: hidden; }
.cnt-thumb-img, .wire-story-thumb, .oa-rail-thumb img {
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.cnt-strip-card:hover .cnt-thumb-img, .cnt-lead:hover .cnt-thumb-img,
.wire-story:hover .wire-story-thumb, .oa-rail-card:hover .oa-rail-thumb img {
  transform: scale(1.03);
}
/* buttons press down */
.room-tog:active, .term-cine:active, .term-icon:active, .oa-stage-go:active,
.cc-overlay-copy:active, .btn:active {
  transform: translateY(1px) scale(0.99);
}

/* ---- 2. image fade-in ---- */
img[data-pfx] { opacity: 0; transition: opacity 0.25s ease; }
img[data-pfx="in"] { opacity: 1; }

/* ---- 3. invisible details ---- */
::selection { background: color-mix(in srgb, var(--up) 32%, transparent); }
:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--up) 65%, transparent);
  outline-offset: 2px;
}
* { scrollbar-width: thin; scrollbar-color: var(--border-2) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 99px; }
*::-webkit-scrollbar-thumb:hover { background: var(--muted); }
*::-webkit-scrollbar-track { background: transparent; }

/* ---- 4. steady terminal digits ---- */
.live-num, .term-index-num, .term-vol-num, .term-row-val, .term-row-pct,
.tape-row, .mkt-card, .term-tape-ticker, .hs-chip {
  font-variant-numeric: tabular-nums;
}

/* ---- 5. the edition reader: drop cap, progress rule, colophon ---- */
.nr-progress {
  position: sticky; top: 0; left: 0; z-index: 5;
  height: 2px; width: 100%;
  background: transparent;
}
.nr-progress > i {
  display: block; height: 100%;
  width: calc(var(--read, 0) * 100%);
  background: var(--down);
  transition: width 0.1s linear;
}
.nr-content > p:first-of-type::first-letter {
  font-family: var(--serif);
  font-weight: 700;
  font-size: 3.1em;
  line-height: 0.8;
  float: left;
  padding: 0.06em 0.12em 0 0;
}
.nr-readtime { color: var(--muted); }
.nr-colophon {
  margin-top: 34px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: center;
}

/* ---- 9. dark-mode lamplight: the paper lit from the corner, like the set ---- */
:root[data-theme="dark"] body::after {
  content: "";
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 1;
  background:
    radial-gradient(120% 90% at 82% -10%, rgba(255, 196, 110, 0.05), transparent 60%),
    radial-gradient(140% 100% at 50% 115%, rgba(0, 0, 0, 0.32), transparent 55%);
}

/* ---- 10. zero layout shift: reserve media space before load ---- */
.wire-story-thumb { aspect-ratio: 16 / 9; object-fit: cover; }
.wire-lead-img { aspect-ratio: 16 / 9; }
.oa-rail-thumb { aspect-ratio: 16 / 9; }
.nr-hero { aspect-ratio: 16 / 9; }

@media (prefers-reduced-motion: reduce) {
  .oa-rail-card, .wire-story, .wire-lead, .wire-latest,
  .cnt-strip-card, .cnt-lead, .mkt-card, .oa-host, .cnt-host,
  .cnt-thumb-img, .wire-story-thumb, .oa-rail-thumb img, img[data-pfx] {
    transition: none;
  }
}
`;

function drawLiveFavicon(onDone: (url: string) => void) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 64, 64);
    // red live dot, bottom-right, with a paper-colored keyline so it pops
    ctx.beginPath();
    ctx.arc(48, 48, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#cc5a45";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f4efe4";
    ctx.stroke();
    onDone(c.toDataURL("image/png"));
  };
  img.src = "/icon.svg";
}

export function PremiumFX() {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.premiumfx = "";
    style.textContent = PFX_CSS;
    document.head.appendChild(style);

    // ---- image fade-in: tag lazy images, reveal on load (or instantly if cached)
    const tag = (img: HTMLImageElement) => {
      if (img.dataset.pfx) return;
      if (img.loading !== "lazy") return; // critical images (logo) stay instant
      if (img.complete) {
        img.dataset.pfx = "in";
        return;
      }
      img.dataset.pfx = "";
      img.addEventListener("load", () => (img.dataset.pfx = "in"), { once: true });
      img.addEventListener("error", () => (img.dataset.pfx = "in"), { once: true });
    };
    document.querySelectorAll("img").forEach(tag);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) tag(n);
          else if (n instanceof Element) n.querySelectorAll("img").forEach(tag);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // ---- instant tabs: warm a route the moment the pointer touches its link
    const warmed = new Set<string>();
    const warm = (e: Event) => {
      const a = (e.target as Element).closest?.('a[href^="/"]');
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.includes("#") || warmed.has(href)) return;
      warmed.add(href);
      fetch(href, { priority: "low" } as RequestInit).catch(() => {});
    };
    document.addEventListener("mouseover", warm, { passive: true });

    // ---- live favicon + title (reacts to <html data-live>)
    const baseTitle = document.title;
    let liveIcon: string | null = null;
    const favicon = (): HTMLLinkElement => {
      let l = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-pfx]');
      if (!l) {
        l = document.createElement("link");
        l.rel = "icon";
        l.dataset.pfx = "";
        document.head.appendChild(l);
      }
      return l;
    };
    const apply = () => {
      const live = document.documentElement.dataset.live === "1";
      if (live) {
        document.title = baseTitle.startsWith("● LIVE") ? document.title : `● LIVE — ${baseTitle}`;
        if (liveIcon) favicon().href = liveIcon;
        else drawLiveFavicon((url) => {
          liveIcon = url;
          if (document.documentElement.dataset.live === "1") favicon().href = url;
        });
      } else {
        document.title = baseTitle;
        const l = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-pfx]');
        if (l) l.remove(); // fall back to the default /icon.svg
      }
    };
    apply();
    const lo = new MutationObserver(apply);
    lo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-live"] });

    return () => {
      style.remove();
      mo.disconnect();
      lo.disconnect();
      document.removeEventListener("mouseover", warm);
    };
  }, []);

  return null;
}
