// Market Bubble X Bridge — background service worker.
// Relays viewer count + chat from the content script to the hub. Background
// fetches are NOT bound by x.com's page CSP, so this is the part that's
// allowed to reach the hub.

const DEFAULT_HUB = "https://market-bubble-hub.onrender.com";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "push") return;
  (async () => {
    const { hub, key } = await chrome.storage.local.get(["hub", "key"]);
    const base = (hub || DEFAULT_HUB).replace(/\/$/, "");
    if (!key) { sendResponse({ ok: false, error: "no key" }); return; }
    const headers = { "content-type": "application/json", "x-ingest-key": key };
    let ok = true;
    try {
      // Only push a count when we know which broadcast it's for — a hostless
      // count would land under the fallback key and clash with the OCR bridge's
      // per-host entries (double-counting the bar).
      if (typeof msg.count === "number" && msg.count >= 0 && msg.host) {
        await fetch(`${base}/ingest/xlive`, {
          method: "POST", headers,
          body: JSON.stringify({ live: msg.count > 0, viewers: msg.count, host: msg.host }),
        });
      }
      if (Array.isArray(msg.chat) && msg.chat.length) {
        // source="ext" → the hub treats the extension as PRIMARY (clean scrape,
        // emojis) and ignores the OCR backup while we're sending.
        await fetch(`${base}/ingest/xchat`, {
          method: "POST", headers,
          body: JSON.stringify({ messages: msg.chat, source: "ext" }),
        });
      }
    } catch (e) {
      ok = false;
    }
    sendResponse({ ok });
  })();
  return true; // async response
});
