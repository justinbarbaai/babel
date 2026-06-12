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
Run this **on the show machine** (or any Mac) during the broadcast:

1. **First time on a machine:** System Settings → Privacy & Security →
   **Screen Recording** → turn on **Terminal**.
2. Double-click **`start-x-bridge.command`**. It opens a dedicated Chrome
   (separate from your normal one) built to not fall asleep.
3. Log into X there, open each broadcast (Banks / Ansem / Market Bubble) in
   its **own window**, on the **current desktop** (a corner is fine — you can
   cover them with other windows; just don't fullscreen-elsewhere or minimize).
4. Press Return in the Terminal. It prints `+N user→Banks` as it pushes X chat.

**Best setup:** a second monitor — broadcasts live there, always rendering,
you work freely on the main screen. That's the set-and-forget version.

**Hard limit (X's fault, not the tool):** the broadcast window must be on the
desktop you're viewing. macOS can't read a window parked on another desktop.

## Keys
- The bridge's **ingest key** lives in `KEY.txt` (and is remembered after the
  first run). It only lets a machine push X numbers/chat — never control the show.
- The Studio password (channels, look) is the separate **operator key**.

## Reliability, honestly
Twitch + Kick + the site are rock-solid. X live chat is a screen-reader — it's
as reliable as keeping the broadcast visible on the run machine. If only one
platform ever flakes, it's X, and the fix is always "is the broadcast window
on this desktop and showing chat?"
