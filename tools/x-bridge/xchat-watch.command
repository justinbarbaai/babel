#!/bin/bash
cd "$(dirname "$0")"
[ -x ./ocr ] || { echo "Building OCR…"; swiftc -O ocr.swift -o ocr; }
echo "Market Bubble — X chat bridge"
read -p "Ingest key: " KEY
read -p "Chat-panel region x,y,w,h [1095,200,400,700]: " REGION
MB_INGEST_KEY="$KEY" MB_CHAT_REGION="${REGION:-1095,200,400,700}" python3 xchat-watch.py
