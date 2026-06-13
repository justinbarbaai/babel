# Market Bubble — Operator Handoff

The site merges **Twitch + Kick + X** chat into one live feed, with live viewer
counts and a market tape. Here's what's automatic and what needs a person.

## Runs itself — nothing to do
- **The website** (Vercel) and **the hub** (the always-on server) stay up 24/7.
- **Twitch + Kick chat and viewer counts** are read automatically by the hub.
  No computer, no tool. They just work whenever the hosts are live.

## Needs the X Bridge — only when there's an X live broadcast
X gives no API or readable page for its live-broadcast chat (it's drawn as
pixels), so one machine reads it off the screen and feeds it to the site.
Any Mac works — the show machine is the natural home.

**Rule zero: only ONE machine runs the bridge at a time.** Two machines
pushing = every message appears on the site twice.

### One-time setup (~2 minutes per machine)
1. Double-click **`mb-panel.command`** (in this folder). Your browser opens
   "The Bridge" dashboard; close the Terminal window it spawned.
2. Paste the **ingest key** into the key box when the page asks (ask Justin;
   it's remembered after that).
3. macOS will ask for screen-capture permission for the helper:
   System Settings → Privacy & Security → **Screen & System Audio Recording**
   → **+** → Applications → **MBCapture** → toggle ON. The helper only ever
   photographs Chrome windows whose titles say they're X pages — nothing
   else on screen.

### Every show
1. Open the dashboard (double-click `mb-panel.command` — it reopens
   http://localhost:8765).
2. Paste each broadcast link (Banks / Ansem / Market Bubble) into the box →
   **Open**. Each opens in its own Chrome window (log into X in Chrome the
   first time). **Fullscreen each window** (green button) — they vanish onto
   their own desktops and nobody looks at them again.
3. Flip the **switch ON**. Within ~15 seconds each stream shows a green dot
   with "last chat Ns ago" ticking.
4. After the show: switch **OFF**.

### The dots
- 🟢 — reading chat, all good
- 🟡 "frames frozen — window minimized?" — someone minimized a broadcast
  window to the Dock. Un-minimize it (fullscreen is fine). That's the ONE
  state macOS refuses to let anyone capture.
- 🟡 "no new chat for Ns" — chat is quiet, or the page died; glance at it
- 🔴 "window lost" — the broadcast window/tab was closed. Paste the link
  again and hit Open.

The bridge fires a loud macOS notification whenever something needs a human,
auto-restarts itself if it crashes, and keeps the display awake by itself.
Keep the laptop plugged in and the lid open.

## Keys
- The bridge's **ingest key** only lets a machine push X chat/counts to the
  site — never control the show. It can be rotated anytime.
- The Studio password (channels, look) is the separate **operator key**.

## Reliability, honestly
Twitch + Kick + the site are rock-solid. X live chat is a screen-reader —
the capture helper photographs the broadcast windows wherever they live
(fullscreen, other desktops, buried), so the only human errors left are:
window closed, window minimized, bridge switched off. The dashboard names
each one in plain English when it happens.
