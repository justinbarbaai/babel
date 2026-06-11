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
  const re = /([\d.,]+\s*[KkMm]?)\s*(watching|viewers|viewing|watched)/;
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
function looksLikeChatRow(el) {
  const t = (el.innerText || "").trim();
  if (!t || t.length < 2 || t.length > 280) return false;
  if (/\d[\d.,]*\s*(watching|viewers|views|reposts|likes|replies)/i.test(t)) return false;
  // a row with a link (the username) + some text after it
  const a = el.querySelector('a[href^="/"]');
  return !!a && t.length > (a.innerText || "").length + 1;
}
function extractChat(el) {
  const a = el.querySelector('a[href^="/"]');
  const username = (a?.getAttribute("href") || "").replace(/^\//, "").split("/")[0] ||
    (a?.innerText || "").trim().replace(/^@/, "");
  let text = (el.innerText || "").trim();
  if (a && text.startsWith(a.innerText)) text = text.slice(a.innerText.length).trim();
  text = text.replace(/^[:\s]+/, "");
  return { username: username || "x", text };
}
const chatObserver = new MutationObserver((muts) => {
  if (!cfg.enabled) return;
  for (const mu of muts) {
    for (const node of mu.addedNodes) {
      if (node.nodeType !== 1) continue;
      const rows = node.matches?.("div,li,article") && looksLikeChatRow(node)
        ? [node]
        : Array.from(node.querySelectorAll?.("div,li,article") || []).filter(looksLikeChatRow).slice(0, 8);
      for (const r of rows) {
        const { username, text } = extractChat(r);
        if (!text) continue;
        const id = (username + ":" + text).slice(0, 160);
        if (seenChat.has(id)) continue;
        seenChat.add(id);
        if (seenChat.size > 4000) seenChat.delete(seenChat.values().next().value);
        chatQueue.push({ id, username, text });
      }
    }
  }
});
chatObserver.observe(document.body, { childList: true, subtree: true });

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
  const count = findViewerCount();
  const batch = chatQueue.splice(0, 25);
  let ok = false;
  try {
    const r = await chrome.runtime.sendMessage({ type: "push", count, chat: batch });
    ok = !!r?.ok;
    if (count != null) lastCount = count;
    chatSent += batch.length;
  } catch {}
  setBadge(
    `MB X Bridge ${ok ? "●" : "○"}\nviews: ${lastCount?.toLocaleString() ?? "—"}\nchat sent: ${chatSent}`,
    ok
  );
}
setInterval(tick, 5000);
tick();
