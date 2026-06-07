"use client";

import { useEffect, useState } from "react";
import { SourceLogo, InstagramLogo } from "./logos";
import { useHub } from "../lib/useHub";
import type { Host } from "../lib/showContent";
import { HOST_SOCIALS, type SocialProfile, type SocialPlatform } from "../lib/socials";

const LABEL: Record<SocialPlatform, string> = {
  x: "X",
  instagram: "Instagram",
  twitch: "Twitch",
  kick: "Kick",
};

// ---- live follower counts (Twitch + X) from the hub, shared across cards ----
type LiveFollowers = { twitch?: Record<string, number | null>; x?: Record<string, number | null> };
let _cache: LiveFollowers | null = null;
let _promise: Promise<LiveFollowers> | null = null;
function loadFollowers(hubHttpUrl: string): Promise<LiveFollowers> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch(`${hubHttpUrl}/socials`)
      .then((r) => r.json())
      .then((d: LiveFollowers) => {
        _cache = d;
        return d;
      })
      .catch(() => ({ twitch: {}, x: {} }));
  }
  return _promise;
}
function useLiveFollowers(): LiveFollowers | null {
  const { hubHttpUrl } = useHub();
  const [data, setData] = useState<LiveFollowers | null>(_cache);
  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    loadFollowers(hubHttpUrl).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [hubHttpUrl]);
  return data;
}

function fmtFollowers(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

// Live count for a profile if the hub has it, else the curated fallback string.
function followersFor(p: SocialProfile, live: LiveFollowers | null): string {
  const key = p.handle.toLowerCase();
  const n = p.platform === "twitch" ? live?.twitch?.[key] : p.platform === "x" ? live?.x?.[key] : null;
  return typeof n === "number" ? fmtFollowers(n) : p.followers;
}

function PlatformLogo({ p, size }: { p: SocialPlatform; size: number }) {
  if (p === "instagram") return <InstagramLogo size={size} />;
  return <SourceLogo source={p} size={size} />;
}

function Verified() {
  return (
    <svg className="sprof-verified" viewBox="0 0 22 22" width="15" height="15" aria-label="Verified">
      <path
        fill="currentColor"
        d="M20.4 11c0-1-.5-1.9-1.3-2.4.3-1 .1-2-.6-2.7-.7-.7-1.7-.9-2.7-.6-.5-.8-1.4-1.3-2.4-1.3s-1.9.5-2.4 1.3c-1-.3-2-.1-2.7.6-.7.7-.9 1.7-.6 2.7-.8.5-1.3 1.4-1.3 2.4s.5 1.9 1.3 2.4c-.3 1-.1 2 .6 2.7.7.7 1.7.9 2.7.6.5.8 1.4 1.3 2.4 1.3s1.9-.5 2.4-1.3c1 .3 2 .1 2.7-.6.7-.7.9-1.7.6-2.7.8-.5 1.3-1.4 1.3-2.4Z"
      />
      <path fill="#fff" d="m9.8 13.6-2.3-2.3 1.1-1.1 1.2 1.2 3-3 1.1 1.1-4.1 4.1Z" />
    </svg>
  );
}

// One platform's profile preview — styled to read like that app's hover card.
function SocialProfileCard({ p, live }: { p: SocialProfile; live: LiveFollowers | null }) {
  const at = p.platform === "twitch" || p.platform === "kick" ? "" : "@";
  const followers = followersFor(p, live);
  return (
    <span className="sprof" data-platform={p.platform} role="tooltip">
      <span className="sprof-top">
        <span className="sprof-avwrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="sprof-av"
            src={p.avatar}
            alt={p.name}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        </span>
        <a className="sprof-follow" href={p.url} target="_blank" rel="noreferrer">
          Follow
        </a>
      </span>
      <span className="sprof-id">
        <span className="sprof-name">
          {p.name}
          {p.verified && <Verified />}
        </span>
        <span className="sprof-handle">
          {at}
          {p.handle}
        </span>
      </span>
      {p.bio && <span className="sprof-bio">{p.bio}</span>}
      <span className="sprof-stats">
        {p.posts && (
          <span className="sprof-stat">
            <b>{p.posts}</b> Posts
          </span>
        )}
        <span className="sprof-stat">
          <b>{followers}</b> Followers
        </span>
        <span className="sprof-plat">
          <PlatformLogo p={p.platform} size={12} /> {LABEL[p.platform]}
        </span>
      </span>
    </span>
  );
}

// A social chip that reveals the platform profile card on hover/focus.
function SocialChip({ p, live }: { p: SocialProfile; live: LiveFollowers | null }) {
  return (
    <span className="schip-wrap">
      <a className="schip" data-platform={p.platform} href={p.url} target="_blank" rel="noreferrer" tabIndex={0}>
        <PlatformLogo p={p.platform} size={12} />
        <span className="schip-label">{LABEL[p.platform]}</span>
      </a>
      <SocialProfileCard p={p} live={live} />
    </span>
  );
}

// Row of a host's socials, each with its platform profile hover card.
export function HostSocials({ host, className = "" }: { host: Host; className?: string }) {
  const live = useLiveFollowers();
  const socials = HOST_SOCIALS[host.handle] || [];
  if (!socials.length) return null;
  return (
    <span className={`host-socials ${className}`}>
      {socials.map((p) => (
        <SocialChip key={p.platform} p={p} live={live} />
      ))}
    </span>
  );
}
