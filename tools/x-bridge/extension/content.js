// Market Bubble X Bridge — content script.
// Runs ON x.com (this computer), reads the live broadcast's viewer count and
// chat straight from the rendered page, and hands them to the background
// worker, which relays to the hub (content-script fetches are blocked by
// x.com's CSP; the background worker is not).

let cfg = { enabled: false };
chrome.storage.local.get(["enabled"], (v) => { cfg.enabled = !!v.enabled; });
chrome.storage.onChanged.addListener((ch) => {
  if (ch.enabled) cfg.enabled = !!ch.enabled.newValue;
});

// "1.2K" / "4,368" / "2.1M" -> integer
function parseCount(s) {
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  if (/k/i.test(m[2] || "")) n *= 1e3;
  if (/m/i.test(m[2] || "")) n *= 1e6;
  return Math.round(n);
}

// Find the live viewer count. X labels it with "watching"/"viewers"/"viewing",
// in text and in aria-labels. Take the largest plausible match.
function findViewerCount() {
  const re = /([\d.,]+\s*[KkMm]?)\s*(watching|viewers|viewing|watched|views)/;
  let best = null;
  // aria-labels first (most stable)
  for (const el of document.querySelectorAll("[aria-label]")) {
    const m = (el.getAttribute("aria-label") || "").match(re);
    if (m) { const n = parseCount(m[1]); if (n != null) best = Math.max(best ?? 0, n); }
  }
  // then visible text nodes
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = w.nextNode())) {
    const m = (node.nodeValue || "").match(re);
    if (m) { const n = parseCount(m[1]); if (n != null) best = Math.max(best ?? 0, n); }
  }
  return best;
}

// Best-effort live-chat scrape. X's live chat rows have scrambled classes, so
// we observe the whole page for newly-added rows that read like
// "username  message" and dedupe. Selectors get tightened once we can watch a
// real live broadcast — the status badge shows what it's catching.
const seenChat = new Set();
const chatQueue = [];

// A live-chat row's innerText is "DisplayName\n@handle\nmessage…". Verified on a
// real broadcast: pull the handle as the username and EVERYTHING AFTER it as the
// message (keeps emojis + non-Latin text, drops the name/handle prefix).
function extractChat(el) {
  const lines = (el.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const hi = lines.findIndex((l) => /^@\w{1,15}$/.test(l));
  let username, msgLines;
  if (hi >= 0) { username = lines[hi].slice(1); msgLines = lines.slice(hi + 1); }
  else {
    const a = el.querySelector('a[href^="/"]');
    username = (a?.getAttribute("href") || "").replace(/^\//, "").split("/")[0];
    msgLines = lines.slice(1);
  }
  return { username: username || "x", text: msgLines.join(" ").trim() };
}

// Which broadcaster THIS tab is on → the label shown as the chat's source
// (Banks / Ansem / Market Bubble). Same mapping the OCR bridge uses, so both
// sources tag identically; unknown handles (test broadcasts) pass through raw.
const BROADCASTERS = { banks: "Banks", blknoiz06: "Ansem", marketbbl: "Market Bubble", marketbubble: "Market Bubble" };
const NAV_HREFS = new Set(["/home","/explore","/notifications","/messages","/jobs","/communities","/i","/settings","/compose","/search","/tos","/privacy"]);
let broadcaster = null; // cached — a tab's broadcast never changes hosts

// The host card (avatar + display name + @handle, all linking to the
// broadcaster's profile) renders over the video in the LEFT region, separate
// from the right-hand chat column. So the profile that appears most often on
// the left half IS the broadcaster. Caches on first detection (the card can
// fade), so an early catch sticks for the whole session.
function detectBroadcaster() {
  if (broadcaster) return broadcaster;
  const W = window.innerWidth;
  const tally = {};
  for (const a of document.querySelectorAll('a[href^="/"]')) {
    const href = (a.getAttribute("href") || "").split("?")[0];
    if (!/^\/[A-Za-z0-9_]{1,15}$/.test(href) || NAV_HREFS.has(href)) continue;
    const r = a.getBoundingClientRect();
    if (!r.width || r.left > W * 0.5) continue; // skip the right-hand chat column
    const h = href.slice(1);
    tally[h] = (tally[h] || 0) + 1;
  }
  let best = null, n = 0;
  for (const h in tally) if (tally[h] > n) { n = tally[h]; best = h; }
  if (best && n >= 2) broadcaster = BROADCASTERS[best.toLowerCase()] || best; // avatar+name+handle = 3 hits
  return broadcaster;
}

// Only ever scrape on a live-broadcast page. The content script is injected on
// ALL of x.com, so without this it would read the right-rail "who to follow"
// panel on the regular timeline as if it were chat. X is a SPA, so this is
// re-checked every cycle (not just at load).
function onBroadcast() {
  return /^\/i\/broadcasts\/[A-Za-z0-9]+/.test(location.pathname);
}
// When the tab moves to a different broadcast (SPA nav), forget the cached host
// and the seen-set so the new broadcast attributes cleanly.
let activeBid = null;
function syncBroadcast() {
  const m = location.pathname.match(/^\/i\/broadcasts\/([A-Za-z0-9]+)/);
  const bid = m ? m[1] : null;
  if (bid !== activeBid) {
    activeBid = bid;
    broadcaster = null;
    seenChat.clear();
    chatQueue.length = 0;
  }
}

// Scan the panel for single-message rows (exactly ONE @handle + a username link)
// and queue any we haven't seen. Periodic scan is robust to X virtualizing the
// list (recycled DOM nodes) — a MutationObserver alone misses those.
function scanChat() {
  if (!cfg.enabled || !onBroadcast()) return; // never scrape the regular timeline
  syncBroadcast();     // reset caches if the tab changed broadcasts
  detectBroadcaster(); // cheap once cached; catches the host card while it's up
  // Chat lives in the right-hand column. Pick rows there that are a SINGLE
  // message (exactly one @handle) with a username link — verified robust on a
  // real broadcast (the "Send a message" panel walk-up was not).
  const W = window.innerWidth;
  const rows = [...document.querySelectorAll("div")].filter((e) => {
    const t = (e.innerText || "").trim();
    if (!t || t.length > 280) return false;
    const h = t.match(/@\w{1,15}/g);
    if (!(h && h.length === 1) || !e.querySelector('a[href^="/"]')) return false;
    const r = e.getBoundingClientRect();
    return r.left > W * 0.5 && r.width < W * 0.5;
  });
  for (const el of rows) {
    const { username, text } = extractChat(el);
    if (!text || /\d[\d.,]*\s*(watching|viewers|views|reposts|likes)/i.test(text)) continue;
    const id = (username + ":" + text).slice(0, 200);
    if (seenChat.has(id)) continue;
    seenChat.add(id);
    if (seenChat.size > 4000) seenChat.delete(seenChat.values().next().value);
    chatQueue.push({ id, username, text });
  }
}
setInterval(scanChat, 2000);

// floating status badge so you can SEE it working without devtools
let badge;
function setBadge(text, ok) {
  if (!badge) {
    badge = document.createElement("div");
    badge.style.cssText =
      "position:fixed;z-index:2147483647;right:14px;bottom:14px;font:600 12px ui-monospace,Menlo,monospace;" +
      "padding:8px 12px;border-radius:10px;background:rgba(16,16,14,.92);color:#f3ebda;" +
      "border:1px solid rgba(244,239,228,.18);box-shadow:0 8px 28px -12px #000;pointer-events:none;white-space:pre";
    document.documentElement.appendChild(badge);
  }
  badge.textContent = text;
  badge.style.borderColor = ok ? "rgba(90,168,115,.7)" : "rgba(244,239,228,.18)";
}

let lastCount = null, chatSent = 0;
async function tick() {
  if (!cfg.enabled) { if (badge) badge.remove(), (badge = null); return; }
  if (!onBroadcast()) {
    // enabled, but the user is browsing regular Twitter — stay idle, push nothing
    chatQueue.length = 0;
    setBadge("MB X Bridge ○\nidle — open a broadcast", false);
    return;
  }
  const count = findViewerCount();
  const channel = detectBroadcaster();
  // tag each message with the broadcast it came from so the site shows the
  // host (Banks / Ansem / …), not the chatter, as the source.
  const batch = chatQueue.splice(0, 25).map((m) => (channel ? { ...m, channel } : m));
  let ok = false;
  try {
    const r = await chrome.runtime.sendMessage({ type: "push", count, chat: batch });
    ok = !!r?.ok;
    if (count != null) lastCount = count;
    chatSent += batch.length;
  } catch {}
  setBadge(
    `MB X Bridge ${ok ? "●" : "○"}\nhost: ${channel || "—"}\nviews: ${lastCount?.toLocaleString() ?? "—"}\nchat sent: ${chatSent}`,
    ok
  );
}
setInterval(tick, 5000);
tick();
