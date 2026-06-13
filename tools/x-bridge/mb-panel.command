#!/bin/bash
# Market Bubble — bridge control panel. Double-click → browser dashboard.
cd "$(dirname "$0")"
# Downloaded from the site? Strip the quarantine flag macOS puts on every file
# so the prebuilt helpers run without a Gatekeeper prompt on each one.
xattr -dr com.apple.quarantine "$PWD" 2>/dev/null
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
if [ -d ./MBCapture.app ]; then
  rm -rf /Applications/MBCapture.app
  cp -R ./MBCapture.app /Applications/MBCapture.app
  xattr -dr com.apple.quarantine /Applications/MBCapture.app 2>/dev/null
fi
# already running? just open the page
if curl -s -o /dev/null --max-time 1 http://localhost:8765/state; then
  open http://localhost:8765
  exit 0
fi
nohup python3 mbpanel.py > /tmp/mbpanel.log 2>&1 &
sleep 1
open http://localhost:8765
echo "Panel running at http://localhost:8765 — you can close this window."
