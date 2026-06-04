// BetterTTV emotes. Global set applies everywhere; channel sets are Twitch-only
// (BTTV has no Kick support — those lookups 404 and fail soft). Each set is
// fetched once and cached as Map(code -> image url).

const EMOTE_URL = (id) => `https://cdn.betterttv.net/emote/${id}/2x.webp`;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`BTTV ${res.status} ${url}`);
  return res.json();
}

function collect(emotes, into) {
  for (const e of emotes || []) {
    if (e?.code && e?.id) into.set(e.code, EMOTE_URL(e.id));
  }
  return into;
}

export class BTTV {
  constructor() {
    this.globalPromise = null;
    this.channelPromises = new Map();
  }

  global() {
    if (!this.globalPromise) {
      this.globalPromise = fetchJson("https://api.betterttv.net/3/cached/emotes/global")
        .then((j) => collect(j, new Map()))
        .catch(() => new Map());
    }
    return this.globalPromise;
  }

  channelMap(platform, id) {
    const key = `${platform}:${id}`;
    if (!this.channelPromises.has(key)) {
      const p = (async () => {
        const merged = new Map(await this.global());
        if (platform === "twitch") {
          try {
            const u = await fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${id}`);
            collect(u?.channelEmotes, merged);
            collect(u?.sharedEmotes, merged);
          } catch {
            // No BTTV channel emotes — global-only is fine.
          }
        }
        return merged;
      })();
      this.channelPromises.set(key, p);
    }
    return this.channelPromises.get(key);
  }
}
