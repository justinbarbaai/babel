#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }

# MBCapture: the ScreenCaptureKit helper that photographs the X broadcast
# windows wherever they live — fullscreen, other desktops, buried. Without it
# the bridge falls back to screencapture (same-desktop only). Install once to
# /Applications; grant Screen Recording in System Settings on first run.
if [ ! -d /Applications/MBCapture.app ] && [ -d ./MBCapture.app ]; then
  echo "Installing MBCapture helper to /Applications…"
  cp -R ./MBCapture.app /Applications/MBCapture.app
fi
if [ -d /Applications/MBCapture.app ] && ! pgrep -qf "MBCapture.app/Contents/MacOS/MBCapture"; then
  echo "Starting MBCapture helper…"
  open -g /Applications/MBCapture.app
fi

echo "Market Bubble — X chat bridge (window capture)"
echo "Each X broadcast in its OWN Chrome window (active tab). Fullscreen, other"
echo "desktops, or buried behind apps is all fine — just NEVER minimize them."
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
