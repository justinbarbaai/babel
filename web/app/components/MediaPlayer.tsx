"use client";

import { useEffect, useState } from "react";
import { TwitchEmbed } from "./TwitchEmbed";
import { type Media, twitchVideoId, twitchClipSlug, tweetId } from "../lib/media";

// Renders the right on-site player for a piece of media:
//  - Twitch VOD / live channel → Embed JS API (reliable autoplay)
//  - Twitch clip → clips iframe (already autoplays)
//  - Kick live → Kick iframe
//  - X post → tweet embed iframe
// Returns null when nothing is embeddable (caller shows an "open on …" fallback).
export function MediaPlayer({ media, muted = false }: { media: Media; muted?: boolean }) {
  const [parent, setParent] = useState("");
  useEffect(() => setParent(window.location.hostname), []);
  if (!parent) return null;

  const url = media.url || "";
  const a = "true";
  const mu = muted ? "true" : "false";

  if (media.source === "twitch") {
    const vid = twitchVideoId(url);
    if (vid) return <TwitchEmbed video={vid} parent={parent} muted={muted} />;
    const slug = twitchClipSlug(url);
    if (slug) {
      return (
        <iframe
          className="mp-iframe"
          title={media.title}
          src={`https://clips.twitch.tv/embed?clip=${slug}&parent=${parent}&autoplay=${a}&muted=${mu}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (media.channel) return <TwitchEmbed channel={media.channel} parent={parent} muted={muted} />;
  }

  if (media.source === "kick" && media.kind === "stream" && media.channel) {
    return (
      <iframe
        className="mp-iframe"
        title={media.title}
        src={`https://player.kick.com/${encodeURIComponent(media.channel)}?autoplay=${a}&muted=${mu}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (media.source === "x") {
    const id = tweetId(url);
    if (id) {
      return (
        <iframe
          className="mp-iframe mp-iframe-x"
          title={media.title}
          src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true`}
          allow="autoplay; encrypted-media"
        />
      );
    }
  }

  return null;
}

// Whether this media can play on-site at all.
export function mediaEmbeddable(media: Media): boolean {
  const url = media.url || "";
  if (media.source === "twitch") return !!(twitchVideoId(url) || twitchClipSlug(url) || media.channel);
  if (media.source === "kick") return media.kind === "stream" && !!media.channel;
  if (media.source === "x") return !!tweetId(url);
  return false;
}
