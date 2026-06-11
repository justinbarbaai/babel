#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
echo "Market Bubble — X chat bridge (window capture)"
echo "Keep the X broadcast as the ACTIVE tab in its Chrome window. You can cover it."
read -p "Ingest key: " KEY
MB_INGEST_KEY="$KEY" python3 xchat-watch.py
