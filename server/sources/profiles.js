import { getTwitchToken } from "./viewers.js";

// Lazy per-chatter profile lookups for the hover card. Cached so repeated hovers
// don't re-hit the API. Twitch resolves any login via Helix (avatar + account
// age). Kick/X viewers aren't reliably resolvable by handle, so they return null
// and the client falls back to local session info.

const cache = new Map(); // "source:name" -> { data, exp }
const TTL = 10 * 60 * 1000;

export async function fetchProfile(source, name, twitchCreds = {}) {
  const clean = String(name || "").trim();
  if (!clean) return null;
  const key = `${source}:${clean.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.exp) return cached.data;

  let data = null;
  try {
    if (source === "twitch") data = await fetchTwitchProfile(clean, twitchCreds);
  } catch {
    data = null;
  }
  cache.set(key, { data, exp: Date.now() + TTL });
  return data;
}

async function fetchTwitchProfile(login, creds) {
  if (!creds.clientId || !creds.clientSecret) return null;
  const token = await getTwitchToken(creds.clientId, creds.clientSecret);
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login.toLowerCase())}`,
    { headers: { "Client-Id": creds.clientId, Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const u = (await res.json())?.data?.[0];
  if (!u) return null;
  return {
    source: "twitch",
    login: u.login,
    displayName: u.display_name || u.login,
    avatar: u.profile_image_url || null,
    createdAt: u.created_at || null,
    description: u.description || null,
  };
}
