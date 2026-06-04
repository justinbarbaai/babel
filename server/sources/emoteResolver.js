import { SevenTV } from "./seventv.js";
import { BTTV } from "./bttv.js";
import { FFZ } from "./ffz.js";

// Combines 7TV + BTTV + FFZ into one name->url map per channel. Each provider
// fetches its own global + channel sets and fails soft, so a slow or missing
// provider never blocks chat. Merge order is FFZ → BTTV → 7TV, so 7TV wins on
// the rare name collision (it's the most-used set on the channels we target).
export class EmoteResolver {
  constructor() {
    this.ffz = new FFZ();
    this.bttv = new BTTV();
    this.seventv = new SevenTV();
    this.cache = new Map(); // `${platform}:${id}` -> Promise<Map>
  }

  channelMap(platform, id) {
    const key = `${platform}:${id}`;
    if (!this.cache.has(key)) {
      const p = (async () => {
        const maps = await Promise.all([
          this.ffz.channelMap(platform, id),
          this.bttv.channelMap(platform, id),
          this.seventv.channelMap(platform, id),
        ]);
        const merged = new Map();
        for (const m of maps) for (const [k, v] of m) merged.set(k, v);
        return merged;
      })();
      this.cache.set(key, p);
    }
    return this.cache.get(key);
  }
}
