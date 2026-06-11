# Market Bubble — X Bridge (Chrome extension)

X removed every public way to read a live broadcast's viewer count, and its
site security blocks any script *on* x.com from reaching our hub. The way
around both: a tiny extension running **on your own computer** that reads the
live page's text directly and pushes it to the hub from outside that sandbox.

It pushes two things to the hub (via the secure ingest endpoints):
- **Live viewer count** -> shows on everyone's X bar (live count, never merged
  into the Twitch+Kick total)
- **Live broadcast chat** (best-effort) -> merges into the site chat as X

## Install (takes 1 minute)
1. Chrome -> `chrome://extensions`
2. Turn on **Developer mode** (top-right)
3. Click **Load unpacked** -> pick this `x-bridge` folder
4. Pin the extension (puzzle icon -> pin "Market Bubble X Bridge")

## Use (when they go live)
1. Open the **X live broadcast** in a tab and sign in (any account that can
   watch it). Leave that tab open.
2. Click the extension icon -> paste your **ingest key** -> **Start**.
3. A small "MB X Bridge" badge appears bottom-right on x.com showing the views
   it's reading and chat it's sent. That's your proof it's working.
4. Hit **Stop** (or close the tab) when the broadcast ends.

## Handing it to their computer
Copy this whole `x-bridge` folder over, Load unpacked there, paste the same
ingest key, Start. Done — no accounts, no build.

## Tuning
The viewer **count** works out of the box (it anchors on "watching"/"viewers"
text). The **chat** scraper uses heuristics because X's markup is scrambled;
the first time there's a real live broadcast, watch the badge's "chat sent"
number — if it's catching junk or missing rows, that's a 5-minute selector
fix in `content.js`.

## Security
The ingest key is limited — it can only push X numbers/chat, never control the
show. It's stored locally in the extension, never in this repo.
