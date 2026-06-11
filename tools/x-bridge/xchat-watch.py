#!/usr/bin/env python3
"""Market Bubble — X broadcast chat → site, via window OCR.
Captures EVERY Chrome window whose active tab is an X live broadcast (Banks,
Ansem, Market Bubble — all at once) and OCRs each chat panel on-device,
pushing new lines to the hub to join the unified Twitch/Kick/X feed.

Each broadcast must be the ACTIVE tab in its OWN Chrome window, and those
windows must stay open (browsers freeze background tabs). You can cover them.

One-time: System Settings → Privacy & Security → Screen Recording → enable
Terminal. Then run ./xchat-watch.command
"""
import subprocess, sys, json, re, time, os, urllib.request

HUB = os.environ.get("MB_HUB", "https://market-bubble-hub.onrender.com")
KEY = os.environ.get("MB_INGEST_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
HERE = os.path.dirname(os.path.abspath(__file__))
OCR, WINFIND = os.path.join(HERE, "ocr"), os.path.join(HERE, "winfind")
HANDLE = re.compile(r"@(\w{2,15})")
BLOCK = {h.lower() for h in (os.environ.get("MB_BLOCK", "Banks,blknoiz06,Polymarket,marketbbl") ).split(",")}

def broadcast_windows():
    """Top-left corner of EVERY Chrome window whose active tab is a broadcast."""
    js = ('tell application "Google Chrome"\n set out to ""\n repeat with w in windows\n'
          '  if (URL of active tab of w) contains "broadcasts/" then\n'
          '   set b to bounds of w\n   set out to out & (item 1 of b as text) & "," & (item 2 of b as text) & "\n"\n'
          '  end if\n end repeat\n return out\nend tell')
    r = subprocess.run(["osascript", "-e", js], capture_output=True, text=True).stdout.strip()
    pts = []
    for line in r.splitlines():
        try: x, y = map(int, line.split(",")); pts.append((x, y))
        except Exception: pass
    return pts

def window_ids():
    """Match each broadcast window's corner to a CGWindow id."""
    pts = broadcast_windows()
    if not pts: return []
    wins = json.loads(subprocess.run([WINFIND], capture_output=True, text=True).stdout or "[]")
    ids = []
    for px, py in pts:
        best, bestd = None, 1e9
        for w in wins:
            d = abs(w["x"] - px) + abs(w["y"] - py)
            if d < bestd: bestd, best = d, w
        if best and bestd < 80 and best["id"] not in ids: ids.append(best["id"])
    return ids

def ocr(png):
    out = subprocess.run([OCR, png], capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return []

def parse(lines):
    lines = [l for l in lines if l.get("x", 0) > 0.58]   # chat panel = right side
    lines.sort(key=lambda l: l["y"])
    txt = [l["text"] for l in lines]
    msgs, i = [], 0
    while i < len(txt):
        m = HANDLE.search(txt[i])
        if not m: i += 1; continue
        user, body, j = m.group(1), [], i + 1
        while j < len(txt) and not HANDLE.search(txt[j]):
            body.append(txt[j]); j += 1
        text = " ".join(body).strip()
        if text and user.lower() not in BLOCK: msgs.append({"username": user, "text": text})
        i = j
    return msgs

def post(msgs):
    if not msgs: return 0
    req = urllib.request.Request(HUB + "/ingest/xchat", data=json.dumps({"messages": msgs}).encode(),
        headers={"content-type": "application/json", "x-ingest-key": KEY})
    try: return json.loads(urllib.request.urlopen(req, timeout=10).read()).get("pushed", 0)
    except Exception as e: print("post error:", e); return 0

def main():
    if not KEY: sys.exit("Set MB_INGEST_KEY (or pass it as arg 1).")
    print(f"Window-capture X chat → {HUB}\nCapturing every open X broadcast window. Ctrl-C to stop.")
    seen, warned = set(), False
    while True:
        ids = window_ids()
        if not ids:
            if not warned: print("No Chrome window with an X broadcast tab found — open one."); warned = True
            time.sleep(5); continue
        warned = False
        fresh = []
        for k, wid in enumerate(ids):
            shot = f"/tmp/mb_xchat_{k}.png"
            try: os.remove(shot)
            except OSError: pass
            subprocess.run(["screencapture", "-x", "-o", "-l", str(wid), shot], capture_output=True)
            if not os.path.exists(shot):
                print("capture failed — grant this app Screen Recording permission."); break
            for m in parse(ocr(shot)):
                k2 = m["username"] + ":" + m["text"]
                if k2 not in seen: seen.add(k2); fresh.append(m)
        if len(seen) > 6000: seen = set(list(seen)[-3000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"{len(ids)} broadcast(s) +{n}", " · ".join("@"+m["username"] for m in fresh[:4]))
        time.sleep(15)

if __name__ == "__main__": main()
