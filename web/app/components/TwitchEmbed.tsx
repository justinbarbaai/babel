"use client";

import { useEffect, useId } from "react";

// Twitch's iframe VOD embeds don't reliably autoplay (they show a play button).
// The Embed JS API does — we create the player and force play() (muted, so the
// browser allows it), retrying, and also on the first user interaction as a
// fallback. Used for VODs + live channels (clips autoplay via their own iframe).

let scriptPromise: Promise<void> | null = null;
function loadTwitch(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Twitch?.Embed) return Promise.resolve();
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
  const rawId = useId();
  const domId = "tw-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    let cancelled = false;
    let cleanupGesture: (() => void) | null = null;
    if (!video && !channel) return;

    loadTwitch()
      .then(() => {
        if (cancelled) return;
        const el = document.getElementById(domId);
        if (!el) return;
        el.innerHTML = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Twitch = (window as any).Twitch;
        if (!Twitch?.Embed) return;

        // Pass the element ID *string* (the Embed API expects an id, not a node).
        const embed = new Twitch.Embed(domId, {
          width: "100%",
          height: "100%",
          parent: [parent],
          autoplay: true,
          muted,
          layout: "video",
          ...(video ? { video } : { channel }),
        });

        const forcePlay = () => {
          try {
            const p = embed.getPlayer();
            p.setMuted(muted);
            p.play();
          } catch {}
        };

        embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
          forcePlay();
          // keep nudging until it's actually playing (or we give up)
          let tries = 0;
          const iv = setInterval(() => {
            if (cancelled || tries >= 6) {
              clearInterval(iv);
              return;
            }
            tries += 1;
            try {
              const p = embed.getPlayer();
              if (p.isPaused && p.isPaused()) forcePlay();
              else clearInterval(iv);
            } catch {}
          }, 500);
        });

        // Fallback: the moment the viewer interacts anywhere, start playback.
        const onGesture = () => forcePlay();
        window.addEventListener("pointerdown", onGesture, { once: true });
        window.addEventListener("keydown", onGesture, { once: true });
        cleanupGesture = () => {
          window.removeEventListener("pointerdown", onGesture);
          window.removeEventListener("keydown", onGesture);
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanupGesture?.();
      const el = document.getElementById(domId);
      if (el) el.innerHTML = "";
    };
  }, [video, channel, parent, muted, domId]);

  return <div id={domId} className="tw-embed" />;
}
