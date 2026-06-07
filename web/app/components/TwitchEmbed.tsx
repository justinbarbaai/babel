"use client";

import { useEffect, useRef } from "react";

// Twitch's iframe VOD embeds don't reliably autoplay (they show a play button).
// The Embed JS API does — we create the player and call play() on ready. Used
// for VODs and live channels (clips already autoplay via their own iframe).

let scriptPromise: Promise<void> | null = null;
function loadTwitch(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as { Twitch?: unknown }).Twitch) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://embed.twitch.tv/embed/v1.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function TwitchEmbed({
  video,
  channel,
  parent,
  muted = true,
}: {
  video?: string | null;
  channel?: string | null;
  parent: string;
  muted?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el || (!video && !channel)) return;

    loadTwitch()
      .then(() => {
        if (cancelled || !el) return;
        el.innerHTML = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Twitch = (window as any).Twitch;
        if (!Twitch?.Embed) return;
        const embed = new Twitch.Embed(el, {
          width: "100%",
          height: "100%",
          parent: [parent],
          muted,
          autoplay: true,
          layout: "video",
          ...(video ? { video } : { channel }),
        });
        embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
          try {
            const p = embed.getPlayer();
            p.setMuted(muted);
            p.play();
          } catch {}
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [video, channel, parent, muted]);

  return <div ref={ref} className="tw-embed" />;
}
