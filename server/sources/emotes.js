// Turn raw chat text into ordered fragments the browser renders inline:
//   { type: "text", text } | { type: "emote", name, url }
// Native emotes (Twitch's IRC tag, Kick's [emote:id:name] codes) are resolved
// first; remaining plain text is then word-matched against the 7TV map. Unicode
// emojis need no handling — they ride through as text and render natively.

const TWITCH_EMOTE = (id) =>
  `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
const KICK_EMOTE = (id) => `https://files.kick.com/emotes/${id}/fullsize`;

// Split plain text into fragments, swapping whole words that match a 7TV emote.
function tokenize7tv(text, map) {
  const out = [];
  if (!text) return out;
  if (!map || map.size === 0) {
    out.push({ type: "text", text });
    return out;
  }
  // Keep the whitespace runs so spacing survives the round-trip.
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    const url = part.trim() ? map.get(part) : null;
    if (url) {
      out.push({ type: "emote", name: part, url });
    } else {
      const last = out[out.length - 1];
      if (last && last.type === "text") last.text += part;
      else out.push({ type: "text", text: part });
    }
  }
  return out;
}

export function twitchFragments(text, emotesTag, sevenTvMap) {
  const cps = [...text]; // code points: Twitch ranges are codepoint-indexed
  const ranges = [];
  if (emotesTag) {
    for (const group of emotesTag.split("/")) {
      const [id, spans] = group.split(":");
      if (!id || !spans) continue;
      for (const span of spans.split(",")) {
        const [a, b] = span.split("-").map(Number);
        if (Number.isInteger(a) && Number.isInteger(b)) ranges.push({ a, b, id });
      }
    }
    ranges.sort((p, q) => p.a - q.a);
  }

  const out = [];
  let i = 0;
  for (const r of ranges) {
    if (r.a > i) out.push(...tokenize7tv(cps.slice(i, r.a).join(""), sevenTvMap));
    out.push({ type: "emote", name: cps.slice(r.a, r.b + 1).join(""), url: TWITCH_EMOTE(r.id) });
    i = r.b + 1;
  }
  if (i < cps.length) out.push(...tokenize7tv(cps.slice(i).join(""), sevenTvMap));
  return out.length ? out : [{ type: "text", text }];
}

export function kickFragments(text, sevenTvMap) {
  const re = /\[emote:(\d+):([^\]]+)\]/g;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...tokenize7tv(text.slice(last, m.index), sevenTvMap));
    out.push({ type: "emote", name: m[2], url: KICK_EMOTE(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...tokenize7tv(text.slice(last), sevenTvMap));
  return out.length ? out : [{ type: "text", text }];
}
