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
      // Heartbeat — fires every tick (5s) the extension is alive on a broadcast,
      // INDEPENDENT of chat or count. This is the dead-man's switch: if it stops,
      // the extension crashed / the tab closed / the scraper hung, and the bridge
      // panel raises a loud alarm so the operator reloads it. A quiet chat looks
      // identical to a dead extension from the outside — only this tells them apart.
      await fetch(`${base}/ingest/xhb`, {
        method: "POST", headers,
        body: JSON.stringify({ host: msg.host || null, sent: msg.sent || 0 }),
      });
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
