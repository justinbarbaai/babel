#!/usr/bin/env python3
"""Market Bubble — X broadcast chat → site, via window OCR.
Captures the CHROME WINDOW showing the X broadcast (by its own pixels), so you
can stack other windows over it and keep working. The X broadcast must stay the
ACTIVE tab in that window and the window must stay open (browsers freeze
background tabs). The chat is canvas-painted, so OCR is the only way in.

One-time: System Settings → Privacy & Security → Screen Recording → enable
Terminal. Then open the X broadcast (Chat panel showing), run ./xchat-watch.command
"""
import subprocess, sys, json, re, time, os, urllib.request

HUB = os.environ.get("MB_HUB", "https://market-bubble-hub.onrender.com")
KEY = os.environ.get("MB_INGEST_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
HERE = os.path.dirname(os.path.abspath(__file__))
OCR, WINFIND = os.path.join(HERE, "ocr"), os.path.join(HERE, "winfind")
HANDLE = re.compile(r"@(\w{2,15})")
# handles that aren't chat (the broadcaster + sponsors) — never post these
BLOCK = {h.lower() for h in (os.environ.get("MB_BLOCK", "Banks,blknoiz06,Polymarket,marketbbl")).split(",")}

def broadcast_window_bounds():
    """The Chrome window whose active tab is the X broadcast → its left/top."""
    js = ('tell application "Google Chrome"\n'
          ' repeat with w in windows\n'
          '  if (URL of active tab of w) contains "broadcasts/" then\n'
          '   set b to bounds of w\n   return (item 1 of b as text) & "," & (item 2 of b as text)\n'
          '  end if\n end repeat\nend tell\nreturn ""')
    r = subprocess.run(["osascript", "-e", js], capture_output=True, text=True).stdout.strip()
    if not r: return None
    try: x, y = map(int, r.split(",")); return (x, y)
    except Exception: return None

def window_id():
    """Match the broadcast window's top-left corner to a CGWindow id."""
    b = broadcast_window_bounds()
    if not b: return None
    wins = json.loads(subprocess.run([WINFIND], capture_output=True, text=True).stdout or "[]")
    best, bestd = None, 1e9
    for w in wins:
        d = abs(w["x"] - b[0]) + abs(w["y"] - b[1])
        if d < bestd: bestd, best = d, w
    return best["id"] if best and bestd < 80 else None

def ocr(png):
    out = subprocess.run([OCR, png], capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return []

def parse(lines):
    # chat panel = right portion of the window; ignore the title/sponsor @handles
    lines = [l for l in lines if l.get("x", 0) > 0.58]
    lines.sort(key=lambda l: l["y"])
    txt = [l["text"] for l in lines]
    msgs, i = [], 0
    while i < len(txt):
        m = HANDLE.search(txt[i])
        if not m: i += 1; continue
        user = m.group(1)
        body, j = [], i + 1
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
    print(f"Window-capture X chat → {HUB}\nKeep the broadcast as the active tab. Ctrl-C to stop.")
    seen, warned = set(), False
    while True:
        wid = window_id()
        if not wid:
            if not warned: print("No Chrome window with an X broadcast tab found — open one."); warned = True
            time.sleep(5); continue
        warned = False
        shot = "/tmp/mb_xchat.png"
        try: os.remove(shot)
        except OSError: pass
        subprocess.run(["screencapture", "-x", "-o", "-l", str(wid), shot], capture_output=True)
        if not os.path.exists(shot):
            print("capture failed — grant this app Screen Recording permission."); time.sleep(5); continue
        fresh = [m for m in parse(ocr(shot)) if (m["username"]+":"+m["text"]) not in seen]
        for m in fresh: seen.add(m["username"]+":"+m["text"])
        if len(seen) > 4000: seen = set(list(seen)[-2000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"+{n}", " · ".join("@"+m["username"] for m in fresh[:4]))
        time.sleep(15)

if __name__ == "__main__": main()
