#!/usr/bin/env python3
"""Market Bubble — X broadcast chat → site, via on-screen OCR.
The X live-broadcast chat is painted to a <canvas> (no readable text, no API),
so we screenshot the chat panel, OCR it on-device (Apple Vision), and push new
lines to the hub. X chat is slow, so a 15s loop is plenty.

One-time setup: System Settings → Privacy & Security → Screen Recording →
enable Terminal (or whatever runs this). Then open the X live broadcast with
the Chat panel visible on the right and run:  ./xchat-watch.command
"""
import subprocess, sys, json, re, time, os, urllib.request

HUB = os.environ.get("MB_HUB", "https://market-bubble-hub.onrender.com")
KEY = os.environ.get("MB_INGEST_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
REGION = os.environ.get("MB_CHAT_REGION") or (sys.argv[2] if len(sys.argv) > 2 else "1095,200,400,700")
HERE = os.path.dirname(os.path.abspath(__file__))
OCR = os.path.join(HERE, "ocr")
HANDLE = re.compile(r"@(\w{2,15})")

def ocr_lines(png):
    out = subprocess.run([OCR, png], capture_output=True, text=True).stdout
    try: return [l["text"] for l in json.loads(out)]
    except Exception: return []

def parse(lines):
    """A line with an @handle is a row header (username); the lines after it,
    until the next header, are that message's body."""
    msgs, i = [], 0
    while i < len(lines):
        m = HANDLE.search(lines[i])
        if not m: i += 1; continue
        user = m.group(1)
        body, j = [], i + 1
        while j < len(lines) and not HANDLE.search(lines[j]):
            body.append(lines[j]); j += 1
        # drop a trailing display-name line that belongs to the next row
        if len(body) > 1 and j < len(lines): body = body[:-0] or body
        text = " ".join(body).strip()
        if text: msgs.append({"username": user, "text": text})
        i = j
    return msgs

def post(msgs):
    if not msgs: return 0
    body = json.dumps({"messages": msgs}).encode()
    req = urllib.request.Request(HUB + "/ingest/xchat", data=body,
        headers={"content-type": "application/json", "x-ingest-key": KEY})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=10).read())
        return r.get("pushed", 0)
    except Exception as e:
        print("post error:", e); return 0

def main():
    if not KEY: sys.exit("Set MB_INGEST_KEY (or pass it as arg 1).")
    print(f"Watching X chat region {REGION} → {HUB}\nCtrl-C to stop.")
    seen = set()
    while True:
        shot = "/tmp/mb_xchat.png"
        subprocess.run(["screencapture", "-x", "-R", REGION, shot], capture_output=True)
        if not os.path.exists(shot):
            print("screencapture failed — grant Screen Recording permission to this app."); time.sleep(5); continue
        fresh = [m for m in parse(ocr_lines(shot)) if (m["username"]+":"+m["text"]) not in seen]
        for m in fresh: seen.add(m["username"]+":"+m["text"])
        if len(seen) > 4000: seen = set(list(seen)[-2000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"+{n}", "·".join(m["username"] for m in fresh[:4]))
        time.sleep(15)

if __name__ == "__main__": main()
