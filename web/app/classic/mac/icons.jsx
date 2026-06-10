"use client";

import React from "react";
// ============================================================================
// Market Bubble Macintosh — pixel glyphs & marks
// The rainbow Apple, Happy Mac and app-tile glyphs from the Classic surface,
// plus new tiles for the desk accessories. All inline SVG, exported on window.
// ============================================================================

function RainbowApple({ size = 12 }) {
  const stripes = ["#5fb44a", "#f5e003", "#f08a1d", "#e23b35", "#8a3f97", "#3b8ed0"];
  const id = React.useId();
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <clipPath id={id}>
          <path d="M27 0c0 4-3 7-7 8 0-4 3-7 7-8zM33 16c-2 1-3 3-3 6 0 4 3 7 5 8-2 5-5 9-8 9-2 0-3-1-6-1s-4 1-6 1c-4 0-9-7-9-15 0-7 4-11 8-11 2 0 4 1 6 1s3-1 6-1c2 0 5 1 7 3z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {stripes.map((c, i) => (
          <rect key={i} x="0" y={(48 / 6) * i} width="40" height={48 / 6} fill={c} />
        ))}
      </g>
    </svg>
  );
}

function HappyMac() {
  return (
    <svg width="56" height="64" viewBox="0 0 24 28" aria-hidden="true" style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="1" width="20" height="26" fill="none" stroke="#dfeee8" strokeWidth="1.4" rx="2"></rect>
      <rect x="4" y="3" width="16" height="13" fill="none" stroke="#dfeee8" strokeWidth="1.2"></rect>
      <rect x="8" y="6" width="1.6" height="2.4" fill="#dfeee8"></rect>
      <rect x="14" y="6" width="1.6" height="2.4" fill="#dfeee8"></rect>
      <path d="M8 11 q4 3 8 0" fill="none" stroke="#dfeee8" strokeWidth="1.2"></path>
      <rect x="6" y="19" width="12" height="1.6" fill="#dfeee8"></rect>
    </svg>
  );
}

const G = (kids, vb = "0 0 24 24") => (
  <svg className="mg" viewBox={vb} aria-hidden="true">{kids}</svg>
);

const MacGlyphs = {
  tv: G(<g><rect x="2.5" y="5" width="19" height="13" rx="2" fill="#1c1c1c" stroke="#fff" strokeWidth="1.2" /><path d="M10 9.5l5 2.8-5 2.8z" fill="#fff" /></g>),
  chart: G(<g><rect x="3" y="13" width="4" height="7" fill="#2fbf71" /><rect x="10" y="8" width="4" height="12" fill="#3ea6ff" /><rect x="17" y="4" width="4" height="16" fill="#f0a020" /></g>),
  chat: G(<g><path d="M3 5h18v11H9l-4 4v-4H3z" fill="#a970ff" stroke="#fff" strokeWidth="1" /><circle cx="8" cy="10.5" r="1.3" fill="#fff" /><circle cx="12" cy="10.5" r="1.3" fill="#fff" /><circle cx="16" cy="10.5" r="1.3" fill="#fff" /></g>),
  news: G(<g><rect x="3" y="4" width="18" height="16" rx="1.5" fill="#f4f1e6" stroke="#333" strokeWidth="1" /><rect x="5.5" y="6.5" width="7" height="6" fill="#cfc7b2" /><rect x="14" y="6.5" width="5" height="1.4" fill="#555" /><rect x="14" y="9.5" width="5" height="1.4" fill="#555" /><rect x="5.5" y="14.5" width="13.5" height="1.3" fill="#555" /><rect x="5.5" y="17" width="13.5" height="1.3" fill="#555" /></g>),
  poly: G(<g><circle cx="12" cy="12" r="9" fill="#1652f0" stroke="#fff" strokeWidth="1" /><path d="M12 12 L12 3.2 A9 9 0 0 1 20 14 Z" fill="#5b8bff" /><text x="12" y="15.5" fontSize="7" fill="#fff" textAnchor="middle" fontFamily="monospace">%</text></g>),
  trash: G(<g><path d="M6 8h12l-1 12H7z" fill="#cfcfcf" stroke="#333" strokeWidth="1" /><rect x="5" y="5.5" width="14" height="2.2" rx="1" fill="#9a9a9a" stroke="#333" strokeWidth="0.8" /></g>),
  doc: G(<g><path d="M6 3h9l3 3v15H6z" fill="#fff" stroke="#333" strokeWidth="1" /><path d="M15 3v3h3" fill="none" stroke="#333" strokeWidth="1" /><rect x="8" y="10" width="8" height="1.3" fill="#888" /><rect x="8" y="13" width="8" height="1.3" fill="#888" /><rect x="8" y="16" width="5" height="1.3" fill="#888" /></g>),
  secret: G(<g><path d="M3 6h7l2 2h9v11H3z" fill="#d9b84a" stroke="#7a5a10" strokeWidth="1" /><text x="13" y="18" fontSize="9" fontWeight="700" textAnchor="middle" fill="#9a1414">!</text></g>),
  bomb: G(<g><circle cx="11" cy="15" r="7" fill="#111" /><circle cx="8.5" cy="13" r="2" fill="#fff" opacity="0.45" /><rect x="13.2" y="5.5" width="2.4" height="4" fill="#3a3a3a" transform="rotate(35 14.4 7.5)" /><path d="M16.5 5.5 q3 -2.5 4 0.6" stroke="#f0a020" strokeWidth="1.4" fill="none" /><circle cx="20.6" cy="6.4" r="1.7" fill="#ff5a2c" /></g>),
  // ---- new desk accessories ----
  trader: G(<g><rect x="2.5" y="4" width="19" height="16" rx="1.5" fill="#0c130d" stroke="#333" strokeWidth="1" /><polyline points="4.5,16 8,12 10.5,14 14,8 16.5,10 19.5,6" fill="none" stroke="#46e08a" strokeWidth="1.5" /><rect x="4.5" y="5.8" width="5" height="1.4" fill="#46e08a" opacity="0.8" /></g>),
  calc: G(<g><rect x="5" y="3" width="14" height="18" rx="1.5" fill="#efece1" stroke="#333" strokeWidth="1" /><rect x="7" y="5" width="10" height="3.4" fill="#2b3328" /><rect x="7" y="10.4" width="2.6" height="2.2" fill="#9aa" /><rect x="10.7" y="10.4" width="2.6" height="2.2" fill="#9aa" /><rect x="14.4" y="10.4" width="2.6" height="2.2" fill="#f08a1d" /><rect x="7" y="13.8" width="2.6" height="2.2" fill="#9aa" /><rect x="10.7" y="13.8" width="2.6" height="2.2" fill="#9aa" /><rect x="14.4" y="13.8" width="2.6" height="2.2" fill="#f08a1d" /><rect x="7" y="17.2" width="6.3" height="2.2" fill="#9aa" /><rect x="14.4" y="17.2" width="2.6" height="2.2" fill="#f08a1d" /></g>),
  paint: G(<g><path d="M12 3c5 0 9 3.4 9 7.6 0 2.8-2 4.4-4.4 4.4H14c-1 0-1.6.7-1.2 1.6.5 1.1.2 2.4-1 2.4-4.9 0-8.8-3.6-8.8-8C3 6.4 7 3 12 3z" fill="#efece1" stroke="#333" strokeWidth="1" /><circle cx="8" cy="8" r="1.4" fill="#e23b35" /><circle cx="12.5" cy="6.5" r="1.4" fill="#3b8ed0" /><circle cx="16.5" cy="8.5" r="1.4" fill="#f5e003" /><circle cx="7" cy="12" r="1.4" fill="#5fb44a" /></g>),
  snake: G(<g><rect x="3" y="3" width="18" height="18" rx="1.5" fill="#0c130d" stroke="#333" strokeWidth="1" /><path d="M6 17h6v-4h6V7" fill="none" stroke="#46e08a" strokeWidth="2.6" /><rect x="16.6" y="5.6" width="2.8" height="2.8" fill="#f0a020" /></g>),
  brick: G(<g><rect x="3" y="3" width="18" height="18" rx="1.5" fill="#0c130d" stroke="#333" strokeWidth="1" /><rect x="5" y="5" width="4.2" height="2.2" fill="#cc5a45" /><rect x="10" y="5" width="4.2" height="2.2" fill="#cc5a45" /><rect x="15" y="5" width="4.2" height="2.2" fill="#cc5a45" /><rect x="5" y="8" width="4.2" height="2.2" fill="#7fc06a" /><rect x="10" y="8" width="4.2" height="2.2" fill="#7fc06a" /><rect x="15" y="8" width="4.2" height="2.2" fill="#7fc06a" /><rect x="11" y="13.5" width="2.2" height="2.2" fill="#f4efe4" /><rect x="8.5" y="17.5" width="7" height="1.8" fill="#a8ffc8" /></g>),
  sweeper: G(<g><rect x="3" y="3" width="18" height="18" rx="1.5" fill="#cfcabf" stroke="#333" strokeWidth="1" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="#9a958a" strokeWidth="0.8" /><text x="6" y="8" fontSize="5" fontWeight="700" fill="#1652f0" textAnchor="middle">1</text><text x="12" y="14" fontSize="5" fontWeight="700" fill="#2f7d52" textAnchor="middle">2</text><path d="M17.2 16.5v3.4M17.2 16.5l2.6 1-2.6 1" stroke="#cc2f1c" strokeWidth="1" fill="#cc2f1c" /></g>),
  sticky: G(<g><path d="M4 4h16v12l-4 4H4z" fill="#ffe9a8" stroke="#b89b3e" strokeWidth="1" /><path d="M20 16h-4v4" fill="#f3d678" stroke="#b89b3e" strokeWidth="1" /><rect x="7" y="8" width="10" height="1.3" fill="#8a763a" /><rect x="7" y="11" width="7" height="1.3" fill="#8a763a" /></g>),
  mail: G(<g><rect x="3" y="6" width="18" height="13" rx="1.2" fill="#f4f1e6" stroke="#333" strokeWidth="1" /><path d="M3.5 7l8.5 7 8.5-7" fill="none" stroke="#333" strokeWidth="1.1" /><rect x="15.5" y="3.5" width="5.5" height="4" fill="#e23b35" stroke="#7a1d18" strokeWidth="0.8" /></g>),
  trophy: G(<g><path d="M8 4h8v6a4 4 0 01-8 0z" fill="#f0c030" stroke="#7a5a10" strokeWidth="1" /><path d="M8 5H4.5c0 3 1.5 5 3.5 5M16 5h3.5c0 3-1.5 5-3.5 5" fill="none" stroke="#7a5a10" strokeWidth="1.2" /><rect x="10.8" y="13.5" width="2.4" height="3.5" fill="#c89a20" /><rect x="7.5" y="17" width="9" height="2.6" rx="0.8" fill="#7a5a10" /></g>),
  control: G(<g><rect x="3" y="4" width="18" height="16" rx="1.5" fill="#efece1" stroke="#333" strokeWidth="1" /><rect x="6" y="7.5" width="12" height="1.6" rx="0.8" fill="#9aa" /><rect x="8.5" y="6.4" width="2.6" height="3.8" rx="0.6" fill="#333" /><rect x="6" y="12" width="12" height="1.6" rx="0.8" fill="#9aa" /><rect x="13.5" y="10.9" width="2.6" height="3.8" rx="0.6" fill="#333" /><rect x="6" y="16.5" width="12" height="1.6" rx="0.8" fill="#9aa" /><rect x="7" y="15.4" width="2.6" height="3.8" rx="0.6" fill="#333" /></g>),
  toaster: G(<g><path d="M4 10c0-3 3-5 8-5s8 2 8 5v7H4z" fill="#cfd2d6" stroke="#333" strokeWidth="1" /><rect x="8" y="6.2" width="8" height="2" rx="1" fill="#555" /><rect x="6" y="13" width="3" height="1.4" fill="#888" /><path d="M2.5 13.5l-2 2M3 16l-2 2" stroke="#9ad" strokeWidth="1" /></g>),
};

// the MB mark in the era's six-stripe rainbow — the system logo everywhere
function RainbowMark({ size = 12 }) {
  return <i className="mb-mark-rainbow" style={{ width: size }} aria-hidden="true"></i>;
}


export { HappyMac, MacGlyphs, RainbowMark, RainbowApple };
