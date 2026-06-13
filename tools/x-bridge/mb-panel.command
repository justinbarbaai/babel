#!/bin/bash
# Market Bubble — bridge control panel. Double-click → browser dashboard.
cd "$(dirname "$0")"
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
if [ ! -d /Applications/MBCapture.app ] && [ -d ./MBCapture.app ]; then
  cp -R ./MBCapture.app /Applications/MBCapture.app
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
