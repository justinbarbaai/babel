#!/bin/bash
# Market Bubble — Bridge installer.
#
# Run this ONCE on the show Mac. It installs the capture agent as a login item
# so it auto-starts at every login and relaunches itself if it ever quits —
# then you never run this again. From then on the agent is always running, so
# the switch in Studio (on the site) is always live: flip it to start/stop
# capturing. Running this again just re-checks the install.
cd "$(dirname "$0")"
DIR="$PWD"
PLIST="$HOME/Library/LaunchAgents/com.marketbubble.bridge.plist"
PY="$(command -v python3 || echo /usr/bin/python3)"

# Downloaded from the site? Strip the quarantine flag macOS puts on every file
# so the prebuilt helpers run without a Gatekeeper prompt on each one.
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null

# Prebuilt arm64 helpers ship in the bundle; rebuild only if missing.
[ -x ./ocr ]     || { echo "Building OCR…";     swiftc -O ocr.swift -o ocr; }
[ -x ./winfind ] || { echo "Building winfind…"; swiftc -O winfind.swift -o winfind; }
if [ -d ./MBCapture.app ]; then
  rm -rf /Applications/MBCapture.app
  cp -R ./MBCapture.app /Applications/MBCapture.app
  xattr -dr com.apple.quarantine /Applications/MBCapture.app 2>/dev/null
fi

# Install / refresh the login item, pointing launchd at THIS folder.
mkdir -p "$HOME/Library/LaunchAgents"
launchctl unload "$PLIST" 2>/dev/null   # drop any previous version
pkill -f "mbpanel.py" 2>/dev/null        # clear a manually-started agent
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.marketbubble.bridge</string>
  <key>ProgramArguments</key>
  <array><string>$PY</string><string>$DIR/mbpanel.py</string></array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/mbpanel.log</string>
  <key>StandardErrorPath</key><string>/tmp/mbpanel.log</string>
</dict></plist>
PLISTEOF
launchctl load -w "$PLIST"

# Wait for the agent to answer locally, then confirm.
ok=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null --max-time 1 http://localhost:8765/state; then ok="yes"; break; fi
  sleep 1
done
echo ""
if [ -n "$ok" ]; then
  echo "✅ Market Bubble bridge installed and running."
  echo "   It auto-starts at every login now — you don't run this again."
  echo "   Control it from Studio on the site (the switch)."
  echo "   Local view (optional): http://localhost:8765"
  open http://localhost:8765
else
  echo "⚠️  Installed, but the agent didn't answer yet. Check /tmp/mbpanel.log."
fi
