"use client";

// Kick's role badges, recreated as inline SVGs. Kick's chat payload only names
// the role (no image URL — kick.com renders these client-side), so we ship the
// same art: green mod sword, gold VIP gem, OG shield, founder badge, etc.
// Subscriber badges usually DO arrive with per-channel art and use that instead.

function Svg({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <svg className="cf-kickbadge" viewBox="0 0 16 16" width="14" height="14" aria-hidden="false" role="img">
      <title>{title}</title>
      {children}
    </svg>
  );
}

export const KICK_BADGES: Record<string, (title: string) => React.ReactNode> = {
  broadcaster: (t) => (
    <Svg title={t}>
      <rect x="0.5" y="2" width="15" height="12" rx="3" fill="#fa1ea4" />
      <path d="M4 6.2h4.6v1.5l2.6-1.7v4l-2.6-1.7v1.5H4z" fill="#fff" />
    </Svg>
  ),
  mod: (t) => (
    <Svg title={t}>
      <path d="M13.7 2.3 8.2 7.8l-1-1L5.8 8.2l1 1-3.5 3.5-1-.9v2.9h2.9l-.9-1 3.5-3.5 1 1 1.4-1.4-1-1 5.5-5.5z" fill="#00e701" />
      <path d="M11.2 10.2l2.5 2.5-1 1-2.5-2.5z" fill="#00e701" />
    </Svg>
  ),
  vip: (t) => (
    <Svg title={t}>
      <path d="M2 5.5 4.5 3h7L14 5.5 8 13.5z" fill="#ffc107" />
      <path d="M5.2 5.6h5.6L8 11z" fill="#ffe082" />
    </Svg>
  ),
  og: (t) => (
    <Svg title={t}>
      <defs>
        <linearGradient id="kog" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00fff2" />
          <stop offset="1" stopColor="#0085ff" />
        </linearGradient>
      </defs>
      <path d="M8 1 14 3.6v4.6c0 3.3-2.5 5.6-6 6.8-3.5-1.2-6-3.5-6-6.8V3.6z" fill="url(#kog)" />
      <text x="8" y="10.4" textAnchor="middle" fontSize="6.2" fontWeight="800" fill="#04263b" fontFamily="Arial, sans-serif">
        OG
      </text>
    </Svg>
  ),
  founder: (t) => (
    <Svg title={t}>
      <defs>
        <linearGradient id="kfo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9d00" />
          <stop offset="1" stopColor="#ff5e00" />
        </linearGradient>
      </defs>
      <path d="M8 .8 14.2 4.4v7.2L8 15.2 1.8 11.6V4.4z" fill="url(#kfo)" />
      <path d="M8 3.4l3.8 2.2v4.8L8 12.6 4.2 10.4V5.6z" fill="#fff3" />
      <text x="8" y="10.6" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">
        F
      </text>
    </Svg>
  ),
  verified: (t) => (
    <Svg title={t}>
      <circle cx="8" cy="8" r="7" fill="#00e701" />
      <path d="M4.6 8.3 7 10.6l4.4-4.8" stroke="#0b0e0f" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  gifter: (t) => (
    <Svg title={t}>
      <rect x="2" y="6" width="12" height="8.5" rx="1.5" fill="#a45eff" />
      <rect x="2" y="6" width="12" height="2.6" fill="#8a3dff" />
      <rect x="7" y="3.5" width="2" height="11" fill="#ffd34d" />
      <path d="M8 4.5C6.6 2.2 3.8 2.6 4 4.1c.2 1.2 2.4 1.3 4 .4 1.6.9 3.8.8 4-.4.2-1.5-2.6-1.9-4 .4z" fill="#ffd34d" />
    </Svg>
  ),
  staff: (t) => (
    <Svg title={t}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#00e701" />
      <path d="M5 4h6v2.2H8.2v1.6h2.4V10H8.2v2H5.8V7.8H5z" fill="#0b0e0f" />
    </Svg>
  ),
  sub: (t) => (
    <Svg title={t}>
      <path d="M8 1.5l1.9 4 4.4.5-3.3 3 1 4.3L8 11l-4 2.3 1-4.3-3.3-3 4.4-.5z" fill="#53fc18" />
    </Svg>
  ),
};
