import { getTwitchToken } from "./viewers.js";

// Resolves Twitch chat badges (the `badges` IRC tag, e.g. "subscriber/12") to
// the real badge images via Helix. Global badges load once; per-channel badge
// sets (custom subscriber/bits tiers) load per room. Lookups are synchronous off
// the cached maps, so messages that arrive before a set finishes loading simply
// fall back to a styled chip until it's ready.

async function fetchBadgeSet(url, creds) {
  const token = await getTwitchToken(creds.clientId, creds.clientSecret);
  const res = await fetch(url, {
    headers: { "Client-Id": creds.clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("twitch badges auth");
    throw new Error(`twitch badges ${res.status}`);
  }
  const json = await res.json();
  // set_id -> Map(version_id -> { img, title })
  const map = new Map();
  for (const set of json.data || []) {
    const versions = new Map();
    for (const v of set.versions || []) {
      versions.set(String(v.id), {
        img: v.image_url_2x || v.image_url_1x || null,
        title: v.title || set.set_id,
      });
    }
    map.set(set.set_id, versions);
  }
  return map;
}

export class TwitchBadgeResolver {
  constructor(creds) {
    this.creds = creds || {};
    this.global = null;
    this.globalLoading = null;
    this.channels = new Map(); // roomId -> Map(set_id -> Map(version -> {img,title}))
    this.channelLoading = new Set();
  }

  enabled() {
    return Boolean(this.creds.clientId && this.creds.clientSecret);
  }

  // Kick off loading of the global + per-channel badge sets (idempotent).
  ensure(roomId) {
    if (!this.enabled()) return;
    if (!this.global && !this.globalLoading) {
      this.globalLoading = fetchBadgeSet("https://api.twitch.tv/helix/chat/badges/global", this.creds)
        .then((m) => {
          this.global = m;
        })
        .catch(() => {})
        .finally(() => {
          this.globalLoading = null;
        });
    }
    if (roomId && !this.channels.has(roomId) && !this.channelLoading.has(roomId)) {
      this.channelLoading.add(roomId);
      fetchBadgeSet(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${roomId}`, this.creds)
        .then((m) => {
          this.channels.set(roomId, m);
        })
        .catch(() => {})
        .finally(() => {
          this.channelLoading.delete(roomId);
        });
    }
  }

  // Synchronous lookup from whatever is cached. Channel set wins over global so
  // custom subscriber/bits badges resolve to the channel's art.
  lookup(roomId, setId, version) {
    const ch = this.channels.get(roomId);
    return (
      ch?.get(setId)?.get(version) || this.global?.get(setId)?.get(version) || null
    );
  }
}
