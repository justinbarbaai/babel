// A piece of playable media (a clip, a VOD, or a live channel) and the logic to
// turn it into an on-site embed URL so it plays in the modal / mini-player
// instead of bouncing the viewer to Twitch/Kick.

export type MediaKind = "clip" | "vod" | "stream";
export type MediaSource = "twitch" | "kick" | "x";

export type Media = {
  kind: MediaKind;
  title: string;
  url?: string;
  source?: MediaSource;
  thumb?: string;
  date?: string;
  duration?: string;
  views?: string;
  channel?: string; // for a live stream embed
};

function twitchClipSlug(url: string): string | null {
  const m =
    url.match(/clips\.twitch\.tv\/(?:embed\?clip=)?([A-Za-z0-9_-]+)/) ||
    url.match(/\/clip\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
function twitchVideoId(url: string): string | null {
  const m = url.match(/videos\/(\d+)/) || url.match(/[?&]video=(\d+)/);
  return m ? m[1] : null;
}

// The iframe src that plays this media in-site, or null if it can't be embedded
// (e.g. Kick clips/VODs have no public embed — fall back to "open on Kick").
export function embedSrc(
  media: Media,
  { parent, autoplay = true, muted = false }: { parent: string; autoplay?: boolean; muted?: boolean }
): string | null {
  const url = media.url || "";
  const a = autoplay ? "true" : "false";
  const mu = muted ? "true" : "false";

  if (media.source === "twitch") {
    const vid = twitchVideoId(url);
    if (media.kind === "vod" || vid) {
      if (vid) return `https://player.twitch.tv/?video=${vid}&parent=${parent}&autoplay=${a}&muted=${mu}`;
    }
    const slug = twitchClipSlug(url);
    if (slug) return `https://clips.twitch.tv/embed?clip=${slug}&parent=${parent}&autoplay=${a}&muted=${mu}`;
    if (media.channel) {
      return `https://player.twitch.tv/?channel=${encodeURIComponent(media.channel)}&parent=${parent}&autoplay=${a}&muted=${mu}`;
    }
  }

  if (media.source === "kick") {
    // Kick only exposes a live-channel embed; clips/VODs have no public iframe.
    if (media.kind === "stream" && media.channel) {
      return `https://player.kick.com/${encodeURIComponent(media.channel)}?autoplay=${a}&muted=${mu}`;
    }
  }

  return null;
}

export function canEmbed(media: Media): boolean {
  return !!embedSrc(media, { parent: "x" });
}

export function sourceLabel(s?: MediaSource): string {
  return s === "twitch" ? "Twitch" : s === "kick" ? "Kick" : s === "x" ? "X" : "";
}
