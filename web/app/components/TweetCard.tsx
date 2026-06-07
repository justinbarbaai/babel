"use client";

import type { Tweet } from "../lib/media";

// A modern, new-X-styled tweet card we render ourselves (X's official embed
// looks dated and can't be restyled). Video plays natively — muted-autoplay,
// which works everywhere, unlike Twitch VODs.

function VerifiedBadge() {
  return (
    <svg className="tw-verified" viewBox="0 0 22 22" width="18" height="18" aria-label="Verified">
      <path
        fill="#1d9bf0"
        d="M20.4 11c0-1-.5-1.9-1.3-2.4.3-1 .1-2-.6-2.7-.7-.7-1.7-.9-2.7-.6-.5-.8-1.4-1.3-2.4-1.3s-1.9.5-2.4 1.3c-1-.3-2-.1-2.7.6-.7.7-.9 1.7-.6 2.7-.8.5-1.3 1.4-1.3 2.4s.5 1.9 1.3 2.4c-.3 1-.1 2 .6 2.7.7.7 1.7.9 2.7.6.5.8 1.4 1.3 2.4 1.3s1.9-.5 2.4-1.3c1 .3 2 .1 2.7-.6.7-.7.9-1.7.6-2.7.8-.5 1.3-1.4 1.3-2.4Z"
      />
      <path fill="#fff" d="m9.8 13.6-2.3-2.3 1.1-1.1 1.2 1.2 3-3 1.1 1.1-4.1 4.1Z" />
    </svg>
  );
}

const XLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Highlight @mentions, $cashtags and #hashtags in X blue.
function renderText(text: string) {
  const parts = text.split(/(\s+)/);
  return parts.map((p, i) => {
    if (/^[@$#][\w]+$/.test(p)) {
      return (
        <span key={i} className="tw-link">
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

const fmt = (n?: number) => {
  if (!n) return "";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
};

export function TweetCard({ tweet, url }: { tweet: Tweet; url?: string }) {
  const handle = (tweet.handle || "").replace(/^@/, "");
  const name = tweet.name || handle;
  const avatar = tweet.avatar || (handle ? `https://unavatar.io/twitter/${handle}` : "");

  return (
    <div className="tw-card">
      <div className="tw-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && <img className="tw-av" src={avatar} alt={name} />}
        <div className="tw-id">
          <span className="tw-name">
            {name}
            {tweet.verified && <VerifiedBadge />}
          </span>
          <span className="tw-handle">@{handle}</span>
        </div>
        <a className="tw-xlogo" href={url} target="_blank" rel="noreferrer" aria-label="Open on X">
          <XLogo />
        </a>
      </div>

      {tweet.text && <div className="tw-text">{renderText(tweet.text)}</div>}

      {tweet.video ? (
        <div className="tw-media">
          {/* native player — muted autoplay works everywhere */}
          <video
            className="tw-video"
            src={tweet.video}
            poster={tweet.thumb}
            autoPlay
            muted
            loop
            playsInline
            controls
          />
        </div>
      ) : tweet.thumb ? (
        <a className="tw-media" href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tw-img" src={tweet.thumb} alt="" />
        </a>
      ) : null}

      <div className="tw-foot">
        {tweet.date && <span className="tw-date">{tweet.date}</span>}
        <span className="tw-stats">
          {fmt(tweet.replies) && <span>{fmt(tweet.replies)} replies</span>}
          {fmt(tweet.likes) && <span>{fmt(tweet.likes)} likes</span>}
        </span>
        <a className="tw-open" href={url} target="_blank" rel="noreferrer">
          View on X ↗
        </a>
      </div>
    </div>
  );
}
