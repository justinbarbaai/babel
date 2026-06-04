// 7TV third-party emotes. Two layers per channel:
//   - global set (https://7tv.io/v3/emote-sets/global)
//   - the channel's own set, keyed by the streamer's platform user id
//     (twitch room-id, or kick user_id).
// We fetch each set once and cache a Map(name -> image url). Lookups are by
// whole-word match against message text. All fetches fail soft to an empty
// map so chat never blocks on 7TV being slow or a channel having no account.

const EMOTE_URL = (id) => `https://cdn.7tv.app/emote/${id}/2x.webp`;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`7TV ${res.status} ${url}`);
  return res.json();
}

function collect(emotes, into) {
  for (const e of emotes || []) {
    if (e?.name && e?.id) into.set(e.name, EMOTE_URL(e.id));
  }
  return into;
}

export class SevenTV {
  constructor() {
    this.globalPromise = null;
    this.channelPromises = new Map(); // `${platform}:${id}` -> Promise<Map>
  }

  global() {
    if (!this.globalPromise) {
      this.globalPromise = fetchJson("https://7tv.io/v3/emote-sets/global")
        .then((j) => collect(j?.emotes, new Map()))
        .catch(() => new Map());
    }
    return this.globalPromise;
  }

  // Merged Map(name -> url) of global + this channel's 7TV emotes.
  channelMap(platform, id) {
    const key = `${platform}:${id}`;
    if (!this.channelPromises.has(key)) {
      const p = (async () => {
        const merged = new Map(await this.global());
        try {
          const user = await fetchJson(`https://7tv.io/v3/users/${platform}/${id}`);
          collect(user?.emote_set?.emotes, merged);
        } catch {
          // No 7TV account for this channel (404) — global-only is fine.
        }
        return merged;
      })();
      this.channelPromises.set(key, p);
    }
    return this.channelPromises.get(key);
  }
}
