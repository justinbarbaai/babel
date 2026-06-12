#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
echo "Market Bubble — X chat bridge (window capture)"
echo "Keep the X broadcast as the ACTIVE tab in its Chrome window. You can cover it."
# remember the key so you only ever enter it once
if [ -f .ingest-key ]; then
  KEY="$(cat .ingest-key)"
  echo "Using saved ingest key (delete .ingest-key to change it)."
else
  read -p "Ingest key: " KEY
  printf '%s' "$KEY" > .ingest-key && chmod 600 .ingest-key
  echo "Saved — you won't be asked again."
fi
MB_INGEST_KEY="$KEY" python3 xchat-watch.py
