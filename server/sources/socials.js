import { getTwitchToken } from "./viewers.js";

// Live follower counts for the hosts' Twitch + X accounts (Instagram/Kick stay
// curated on the client — no usable public API). Heavily cached: follower
// counts barely move, and every X read costs money, so default TTL is 6h.

let cache = null;
let cacheExp = 0;

async function twitchFollowers(login, clientId, clientSecret) {
  if (!clientId || !clientSecret || !login) return null;
  const token = await getTwitchToken(clientId, clientSecret);
  const headers = { "Client-ID": clientId, Authorization: `Bearer ${token}` };
  const u = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login.toLowerCase())}`,
    { headers }
  );
  if (!u.ok) return null;
  const uj = await u.json();
  const id = uj.data?.[0]?.id;
  if (!id) return null;
  const f = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${id}&first=1`,
    { headers }
  );
  if (!f.ok) return null;
  const fj = await f.json();
  return typeof fj.total === "number" ? fj.total : null;
}

async function xFollowers(handle, bearer) {
  if (!bearer || !handle) return null;
  const res = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle.replace(/^@/, ""))}?user.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${bearer}` } }
  );
  if (!res.ok) return null;
  const j = await res.json();
  const n = j.data?.public_metrics?.followers_count;
  return typeof n === "number" ? n : null;
}

// twitch: [logins], x: [handles]. Returns { twitch: {login: n|null}, x: {handle: n|null}, updatedAt }.
export async function fetchSocials({ twitch = [], x = [] }, creds, bearer, { ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  if (cache && Date.now() < cacheExp) return cache;
  const out = { twitch: {}, x: {}, updatedAt: Date.now() };
  await Promise.all([
    ...twitch.map(async (login) => {
      out.twitch[login.toLowerCase()] = await twitchFollowers(login, creds.clientId, creds.clientSecret).catch(() => null);
    }),
    ...x.map(async (h) => {
      out.x[h.toLowerCase()] = await xFollowers(h, bearer).catch(() => null);
    }),
  ]);
  cache = out;
  cacheExp = Date.now() + ttlMs;
  return cache;
}
