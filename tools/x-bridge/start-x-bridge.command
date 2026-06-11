#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ]     || swiftc -O ocr.swift -o ocr
[ -x ./winfind ] || swiftc -O winfind.swift -o winfind
echo "── Market Bubble · X Bridge ───────────────────────────────"
echo "Opening a dedicated Chrome for the broadcasts (won't touch your normal Chrome)."
echo "It's launched with anti-sleep flags so it keeps updating even when covered."
# a separate Chrome instance + profile, told never to throttle hidden/occluded windows
open -na "Google Chrome" --args \
  --user-data-dir="$HOME/.mb-xbridge-chrome" \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-features=CalculateNativeWinOcclusion \
  "https://x.com" >/dev/null 2>&1
echo ""
echo "In that new Chrome window:"
echo "  1. Log into X (any account — a burner is fine)."
echo "  2. Open each live broadcast you want (Banks / Ansem / Market Bubble),"
echo "     EACH in its own window (⌘N for a new window, then open the broadcast)."
echo "  3. Keep those windows on THIS desktop (a corner is fine — you can cover them)."
echo ""
read -p "Press Return once the broadcasts are open and showing chat… " _
KEY="$( [ -f .ingest-key ] && cat .ingest-key )"
[ -z "$KEY" ] && { read -p "Ingest key: " KEY; printf '%s' "$KEY" > .ingest-key && chmod 600 .ingest-key; }
echo "Watching. Leave this window open (minimize it). Ctrl-C to stop."
MB_INGEST_KEY="$KEY" python3 xchat-watch.py
