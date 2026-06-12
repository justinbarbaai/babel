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
                  r"[+\-]\d+\.\d+\s*%|\$\d{3,}|presented by|polymarket|bubble20|app store|"
                  r"\b[A-Z]{2,5}\s+\d+\.\d{2}|©\s*[A-Z]|[▲▼]\s*\d|\d+\.\d{2}\s*\(?[+\-]\d)", re.I)

def broadcast_windows():
    """(corner_x, corner_y, broadcast_id) for every Chrome broadcast window."""
    js = ('tell application "Google Chrome"\n set out to ""\n repeat with w in windows\n'
          '  try\n   set u to URL of active tab of w\n   if u contains "broadcasts/" then\n'
          '    set b to bounds of w\n    set out to out & (item 1 of b as text) & "," & (item 2 of b as text) & "," & u & "\n"\n'
          '   end if\n  end try\n end repeat\n return out\nend tell')
    r = subprocess.run(["osascript", "-e", js], capture_output=True, text=True).stdout.strip()
    out = []
    for line in r.splitlines():
        try:
            x, y, url = line.split(",", 2)
            m = re.search(r"broadcasts/([A-Za-z0-9]+)", url)
            out.append((int(x), int(y), m.group(1) if m else url))
        except Exception: pass
    return out

def chrome_windows():
    """All Chrome windows from the window server, with bounds (no AppleScript)."""
    return json.loads(subprocess.run([WINFIND], capture_output=True, text=True).stdout or "[]")

def capture_targets():
    """Each open broadcast window → its CGWindow id + bounds + broadcast id."""
    wins = chrome_windows()
    big = [w for w in wins if w["w"] >= 700 and w["h"] >= 450]
    bw = broadcast_windows()
    targets = []
    if bw:
        for px, py, bid in bw:
            m = min(big or wins, key=lambda w: abs(w["x"]-px)+abs(w["y"]-py), default=None)
            if m: targets.append({**m, "bid": bid})
    else:                                # URL read failed → OCR every big window
        targets = [{**w, "bid": w["id"]} for w in big]
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
ANCHOR = re.compile(r"started|subscribe|follow|\bago\b|\blive\b", re.I)
def broadcaster_of(lines, bid=None):
    """The real broadcaster = a known handle that sits NEAR a Started/Subscribe/
    Follow anchor (the broadcaster card) — not the Market Bubble watermark in the
    video. Cached by the stable broadcast id."""
    left = [l for l in lines if l.get("x", 1) < 0.58]
    for i, l in enumerate(left):
        m = HANDLE.search(l["text"])
        if not m or m.group(1).lower() not in BROADCASTERS: continue
        near = any(ANCHOR.search(left[j]["text"]) for j in range(max(0, i-2), min(len(left), i+3)))
        if near:
            label = BROADCASTERS[m.group(1).lower()]
            if bid is not None: _bc_cache[bid] = label
            return label
    return _bc_cache.get(bid)   # remembered from a frame where the card was visible

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
        # if the first body line is the chatter's own display name (short, no
        # sentence, often resembles the handle), drop it
        if len(body) > 1:
            first = body[0]
            norm = re.sub(r"[^a-z0-9]", "", first.lower())
            if len(first) < 18 and "." not in first and "?" not in first and (
               " " not in first.strip() or norm[:4] in user.lower() or user.lower()[:4] in norm):
                body = body[1:]
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
            source = broadcaster_of(lines, w['bid'])
            for m in parse(lines, source):
                k2 = m["username"] + ":" + m["text"]
                if k2 not in seen: seen.add(k2); fresh.append(m)
        if len(seen) > 6000: seen = set(list(seen)[-3000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"{captured} window(s) +{n}", " · ".join(f'{m["username"]}→{m["channel"]}' for m in fresh[:3]))
        time.sleep(15)

if __name__ == "__main__": main()
