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
# which broadcaster a window belongs to → the label shown as the chat source
BROADCASTERS = {"banks": "Banks", "blknoiz06": "Ansem", "marketbbl": "Market Bubble",
                "marketbubble": "Market Bubble"}
# exact UI strings that are NEVER chat messages, + ticker/disclaimer/promo junk
UI = re.compile(r"^(ask gemini|chat|subscribe|resubscribe|send a message|follow|gift a sub|"
                r"\.\.\.|los angeles|new york|-? ?polymarket|bubbl|bubh|ubl|sign up|copy the best|\W*)$", re.I)
JUNK = re.compile(r"(\d{1,2}:\d{2}\s*(pm|am|et|pt)\b|informational and entertain|not constitute|"
                  r"[+\-]\d+\.\d+\s*%|\$\d{3,}|presented by|polymarket|bubble20|app store)", re.I)

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

def chrome_windows():
    """All Chrome windows from the window server, with bounds (no AppleScript)."""
    return json.loads(subprocess.run([WINFIND], capture_output=True, text=True).stdout or "[]")

def capture_targets():
    """Windows to OCR. Prefer the ones AppleScript flags as broadcasts; if that
    can't read URLs (separate profiles, app windows), fall back to every large
    Chrome window. Each target carries both a CGWindow id and its bounds, so we
    can window-capture (-l) and region-capture (-R) as a fallback."""
    wins = chrome_windows()
    big = [w for w in wins if w["w"] >= 700 and w["h"] >= 450]
    pts = broadcast_windows()
    targets = []
    if pts:
        for px, py in pts:
            m = min(big or wins, key=lambda w: abs(w["x"]-px)+abs(w["y"]-py), default=None)
            if m and m not in targets: targets.append(m)
    if not targets:                      # URL read failed → OCR every big window
        targets = big
    return targets

def capture(w):
    shot = "/tmp/mb_xcap.png"
    try: os.remove(shot)
    except OSError: pass
    subprocess.run(["screencapture", "-x", "-o", "-l", str(w["id"]), shot], capture_output=True)
    if not os.path.exists(shot):         # window capture failed → grab its region
        r = f'{int(w["x"])},{int(w["y"])},{int(w["w"])},{int(w["h"])}'
        subprocess.run(["screencapture", "-x", "-R", r, shot], capture_output=True)
    return shot if os.path.exists(shot) else None

def ocr(png):
    out = subprocess.run([OCR, png], capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return []

_bc_cache = {}
def broadcaster_of(lines, wid=None):
    """Who owns this broadcast? Their handle appears OUTSIDE the chat (left/center)."""
    for l in lines:
        if l.get("x", 1) >= 0.58: continue
        m = HANDLE.search(l["text"])
        if m and m.group(1).lower() in BROADCASTERS:
            label = BROADCASTERS[m.group(1).lower()]
            if wid is not None: _bc_cache[wid] = label
            return label
    return _bc_cache.get(wid)   # remembered from a frame where the header was visible

def parse(lines, source):
    chat = sorted([l for l in lines if l.get("x", 0) > 0.58], key=lambda l: l["y"])
    txt = [l["text"] for l in chat]
    hidx = [i for i, t in enumerate(txt) if HANDLE.search(t)]   # @handle line indices
    msgs = []
    for n, i in enumerate(hidx):
        user = HANDLE.search(txt[i]).group(1)
        if user.lower() in BLOCK: continue
        nxt = hidx[n + 1] if n + 1 < len(hidx) else len(txt)
        end = nxt - 1 if nxt < len(txt) else nxt     # drop the next row's display name
        body = []
        for k in range(i + 1, end):
            t = txt[k].strip()
            if t and not UI.match(t) and not JUNK.search(t): body.append(t)
        text = " ".join(body).strip()
        text = re.sub(r"\s+\S{1,3}$", "", text) if len(text) > 12 else text  # drop trailing crumb
        text = text.strip(" •·~&")
        if len(text) >= 2: msgs.append({"username": user, "text": text, "channel": source or user})
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
        targets = capture_targets()
        if not targets:
            if not warned: print("No Chrome window found — open the X broadcast in Chrome."); warned = True
            time.sleep(5); continue
        warned = False
        fresh, captured = [], 0
        for w in targets:
            shot = capture(w)
            if not shot:
                print("capture failed — is this app allowed in Screen Recording?"); continue
            captured += 1
            lines = ocr(shot)
            source = broadcaster_of(lines, w['id'])
            for m in parse(lines, source):
                k2 = m["username"] + ":" + m["text"]
                if k2 not in seen: seen.add(k2); fresh.append(m)
        if len(seen) > 6000: seen = set(list(seen)[-3000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"{captured} window(s) +{n}", " · ".join(f'{m["username"]}→{m["channel"]}' for m in fresh[:3]))
        time.sleep(15)

if __name__ == "__main__": main()
