"use client";

import { SourceLogo, InstagramLogo } from "./logos";
import type { Host } from "../lib/showContent";

type SocialLink = { key: string; label: string; url: string };

// Build a host's social links from the data — X, Instagram, Twitch, Kick (only
// the ones they have).
export function hostSocials(h: Host): SocialLink[] {
  const links: SocialLink[] = [];
  if (h.twitch) links.push({ key: "twitch", label: "Twitch", url: `https://twitch.tv/${h.twitch}` });
  if (h.kick) links.push({ key: "kick", label: "Kick", url: `https://kick.com/${h.kick}` });
  if (h.instagram) links.push({ key: "instagram", label: "Instagram", url: `https://instagram.com/${h.instagram}` });
  links.push({ key: "x", label: "X", url: h.url });
  return links;
}

function Logo({ k, size }: { k: string; size: number }) {
  if (k === "instagram") return <InstagramLogo size={size} />;
  return <SourceLogo source={k as "twitch" | "kick" | "x"} size={size} />;
}

// Hover popup of a host's socials — mirrors the chat profile card. Drop it inside
// a position:relative host card; CSS reveals it on hover/focus.
export function HostSocialCard({ host }: { host: Host }) {
  const links = hostSocials(host);
  return (
    <span className="hsc-pop" role="tooltip">
      <span className="hsc-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hsc-av" src={host.avatar} alt={host.name} loading="lazy" />
        <span className="hsc-id">
          <span className="hsc-name">{host.name}</span>
          <span className="hsc-handle">{host.role} · @{host.handle}</span>
        </span>
      </span>
      <span className="hsc-links">
        {links.map((l) => (
          <a
            key={l.key}
            className="hsc-link"
            data-source={l.key}
            href={l.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="hsc-link-logo">
              <Logo k={l.key} size={14} />
            </span>
            <span className="hsc-link-label">{l.label}</span>
            <span className="hsc-link-arrow">↗</span>
          </a>
        ))}
      </span>
    </span>
  );
}
