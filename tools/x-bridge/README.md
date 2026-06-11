# Market Bubble — X Bridge

X walled off every automated path to its live broadcast: the **view count** is in
the page but only labeled "views", and the **chat** is painted to a `<canvas>`
(no readable text, no API). Both are solvable by reading what's already on the
operator's screen. Two tools:

## 1. xchat-watch — X broadcast chat → the site  (the main one)
Captures the **Chrome window** showing the X broadcast (its own pixels, by
window id) and OCRs the chat panel on-device (Apple Vision) → pushes new lines
to the hub, joining the unified Twitch/Kick/X feed as X messages.

**Window capture means you can keep working:** stack other windows over the
broadcast, it still captures. The only rules: the broadcast must stay the
**active tab** in its Chrome window, and that window must stay **open** (browsers
freeze background tabs, so don't switch that tab away or minimize the window).
A second monitor — or just parking the window on your current desktop — is ideal.

**Setup (once):**
1. System Settings → Privacy & Security → **Screen Recording** → enable **Terminal**.
2. Open the X live broadcast with the **Chat panel showing**.
3. Double-click **`xchat-watch.command`**, paste the ingest key. Done.
It finds the broadcast window automatically (by the tab URL), prints `+N @user`
when it pushes new messages, and re-finds the window if you move it. The
broadcaster + sponsor handles are filtered out (set `MB_BLOCK` to change).
Hand off by copying this folder to any Mac (repeat step 1 there).

## 2. The Chrome extension — X live view count → the site
`manifest.json` + `content.js` + `background.js` read the broadcast's "views"
number from the page and push it to the hub (the page DOM *does* expose that one).
Load unpacked at `chrome://extensions` (Developer mode → Load unpacked → this
folder), open the popup, paste the ingest key, Start. The count auto-updates.

Both push to the same hub ingest endpoints, guarded by the ingest key (server-side
secret — never commit it). The X chat is slow, so a 15s loop stays well ahead.
