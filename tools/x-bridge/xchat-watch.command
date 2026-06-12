#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
echo "Market Bubble — X chat bridge (window capture)"
echo "Each X broadcast in its OWN Chrome window (active tab). Hidden behind"
echo "other apps is fine — just don't minimize them or move them to another desktop."
# remember the key so you only ever enter it once
if [ -f .ingest-key ]; then
  KEY="$(cat .ingest-key)"
  echo "Using saved ingest key (delete .ingest-key to change it)."
else
  read -p "Ingest key: " KEY
  printf '%s' "$KEY" > .ingest-key && chmod 600 .ingest-key
  echo "Saved — you won't be asked again."
fi

# caffeinate -dis  = keep the DISPLAY (-d), disk (-i with i) and system (-s)
# awake while the bridge runs — a sleeping display turns every capture black.
# The loop auto-restarts the bridge if it ever crashes (5s backoff), so a
# mid-show hiccup heals itself. Ctrl-C twice stops everything for real.
while true; do
  MB_INGEST_KEY="$KEY" caffeinate -dis python3 xchat-watch.py
  code=$?
  [ $code -eq 0 ] && break          # clean Ctrl-C exit — stop the loop too
  echo ""
  echo "⚠️  bridge exited unexpectedly (code $code) — restarting in 5s (Ctrl-C to stop)"
  sleep 5 || break
done
