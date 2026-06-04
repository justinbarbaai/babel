// FrankerFaceZ emotes. Global set applies everywhere; channel sets are
// Twitch-only (FFZ has no Kick rooms). Each set is fetched once and cached as
// Map(name -> image url). FFZ emoticons carry a urls map keyed by scale.

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FFZ ${res.status} ${url}`);
  return res.json();
}

function pickUrl(urls) {
  const u = urls?.["2"] || urls?.["1"] || urls?.["4"];
  if (!u) return null;
  return u.startsWith("//") ? `https:${u}` : u;
}

function collectSets(sets, keys, into) {
  for (const k of keys) {
    for (const e of sets?.[k]?.emoticons || []) {
      const url = pickUrl(e.urls);
      if (e?.name && url) into.set(e.name, url);
    }
  }
  return into;
}

export class FFZ {
  constructor() {
    this.globalPromise = null;
    this.channelPromises = new Map();
  }

  global() {
    if (!this.globalPromise) {
      this.globalPromise = fetchJson("https://api.frankerfacez.com/v1/set/global")
        .then((j) => collectSets(j.sets, (j.default_sets || []).map(String), new Map()))
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
            const j = await fetchJson(`https://api.frankerfacez.com/v1/room/id/${id}`);
            collectSets(j.sets, Object.keys(j.sets || {}), merged);
          } catch {
            // No FFZ room — global-only is fine.
          }
        }
        return merged;
      })();
      this.channelPromises.set(key, p);
    }
    return this.channelPromises.get(key);
  }
}
