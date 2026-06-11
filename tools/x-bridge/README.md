# Market Bubble — X Bridge

X walled off every automated path to its live broadcast: the **view count** is in
the page but only labeled "views", and the **chat** is painted to a `<canvas>`
(no readable text, no API). Both are solvable by reading what's already on the
operator's screen. Two tools:

## 1. xchat-watch — X broadcast chat → the site  (the main one)
On-screen OCR (Apple Vision, on-device) of the X chat panel → pushes new lines
to the hub, where they join the unified Twitch/Kick/X feed as X messages.

**Setup (once):**
1. System Settings → Privacy & Security → **Screen Recording** → enable **Terminal**.
2. Open the X live broadcast and make sure the **Chat panel is visible on the right**.
3. Double-click **`xchat-watch.command`**. Paste the ingest key. Press enter for the
   default chat region (or pass your own `x,y,w,h` if the panel sits elsewhere).
It prints `+N user·user` each time it pushes new messages. Leave it running during
the show. Hand off by copying this folder to any Mac (repeat step 1 there).

Tune the region: the default `1095,200,400,700` fits a 1512-wide screen with the
broadcast maximized. Wrong spot? Pass the chat panel's `x,y,width,height`.

## 2. The Chrome extension — X live view count → the site
`manifest.json` + `content.js` + `background.js` read the broadcast's "views"
number from the page and push it to the hub (the page DOM *does* expose that one).
Load unpacked at `chrome://extensions` (Developer mode → Load unpacked → this
folder), open the popup, paste the ingest key, Start. The count auto-updates.

Both push to the same hub ingest endpoints, guarded by the ingest key (server-side
secret — never commit it). The X chat is slow, so a 15s loop stays well ahead.
