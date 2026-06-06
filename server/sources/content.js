import { getTwitchToken } from "./viewers.js";

// Pulls clips + past broadcasts (VODs) for the Twitch channel(s) via Helix,
// reusing the same app credentials as the viewer counts. Cached so the /content
// route doesn't hammer the API.

async function helix(path, creds, token) {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { "Client-ID": creds.clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Helix ${path} failed (${res.status})`);
  return res.json();
}

async function userId(login, creds, token) {
  const j = await helix(`users?login=${encodeURIComponent(String(login).toLowerCase())}`, creds, token);
  return j.data?.[0]?.id || null;
}

// Twitch thumbnail URLs are either direct (clips) or templated with
// %{width}x%{height} / {width}x{height} (videos).
function sizeThumb(url, w = 640, h = 360) {
  if (!url) return "";
  return url
    .replace("%{width}", w)
    .replace("%{height}", h)
    .replace("{width}", w)
    .replace("{height}", h);
}

function formatViews(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return String(n);
}

// "1h2m3s" -> "1H 02M"
function prettyDuration(d) {
  if (!d) return "";
  const m = String(d).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!m) return String(d);
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  if (h) return `${h}H ${String(min).padStart(2, "0")}M`;
  return `${min}M`;
}

let cache = { at: 0, data: null };

export async function fetchContent(channels, creds, { ttlMs = 5 * 60 * 1000 } = {}) {
  if (cache.data && Date.now() - cache.at < ttlMs) return cache.data;
  if (!creds?.clientId || !creds?.clientSecret) return { clips: [], streams: [], updatedAt: Date.now() };

  const token = await getTwitchToken(creds.clientId, creds.clientSecret);
  const clips = [];
  const streams = [];
  const since = new Date(Date.now() - 21 * 24 * 3600 * 1000).toISOString();

  for (const login of channels) {
    const id = await userId(login, creds, token);
    if (!id) continue;
    try {
      const cj = await helix(
        `clips?broadcaster_id=${id}&first=20&started_at=${encodeURIComponent(since)}`,
        creds,
        token
      );
      for (const c of cj.data || []) {
        clips.push({
          title: c.title,
          date: (c.created_at || "").slice(0, 10),
          thumb: sizeThumb(c.thumbnail_url),
          url: c.url,
          source: "twitch",
          createdAt: c.created_at || "",
        });
      }
    } catch {}
    try {
      const vj = await helix(`videos?user_id=${id}&type=archive&first=8`, creds, token);
      for (const v of vj.data || []) {
        streams.push({
          title: v.title,
          date: (v.created_at || "").slice(0, 10),
          duration: prettyDuration(v.duration),
          views: formatViews(v.view_count),
          thumb: sizeThumb(v.thumbnail_url),
          url: v.url,
          source: "twitch",
          createdAt: v.created_at || "",
        });
      }
    } catch {}
  }

  clips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  streams.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const data = {
    clips: clips.slice(0, 12),
    streams: streams.slice(0, 8),
    updatedAt: Date.now(),
  };
  cache = { at: Date.now(), data };
  return data;
}
