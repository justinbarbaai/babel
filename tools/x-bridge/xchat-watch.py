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
# lines that are NOT chat: the market ticker + the standing disclaimer overlay
JUNK = re.compile(r"(informational and entertainment|not constitute|financial.*advice|"
                  r"[+\-]\d+\.\d+\s*%|\$\d|\b\d+\.\d{2}\b.*[+\-]|sign up for|app store|"
                  r"copy the best|bubble20|presented by|polymarket)", re.I)

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

def broadcaster_of(lines):
    """Who owns this broadcast? Their handle appears OUTSIDE the chat (left/center)."""
    for l in lines:
        if l.get("x", 1) >= 0.58: continue
        m = HANDLE.search(l["text"])
        if m and m.group(1).lower() in BROADCASTERS:
            return BROADCASTERS[m.group(1).lower()]
    return None

def parse(lines, source):
    chat = sorted([l for l in lines if l.get("x", 0) > 0.58], key=lambda l: l["y"])
    txt = [l["text"] for l in chat]
    handles = [(HANDLE.search(t).group(1) if HANDLE.search(t) else None) for t in txt]
    msgs, i = [], 0
    while i < len(txt):
        if not handles[i]: i += 1; continue
        user, body, j = handles[i], [], i + 1
        while j < len(txt) and not handles[j]:
            body.append(txt[j]); j += 1
        # drop a trailing line that's the NEXT chatter's display name (it sits
        # right before the next @handle and resembles it)
        if body and j < len(txt) and handles[j]:
            norm = re.sub(r"[^a-z0-9]", "", body[-1].lower()); nh = handles[j].lower()
            if norm and (norm in nh or nh.startswith(norm[:4]) or (len(body[-1]) < 14 and " " not in body[-1].strip())):
                body = body[:-1]
        clean = [t for t in body if not JUNK.search(t)]
        text = " ".join(clean).strip()
        if JUNK.search(text): text = JUNK.split(text)[0].strip()   # cut mid-line junk
        if text and user.lower() not in BLOCK:
            msgs.append({"username": user, "text": text, "channel": source or user})
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
            source = broadcaster_of(lines)
            for m in parse(lines, source):
                k2 = m["username"] + ":" + m["text"]
                if k2 not in seen: seen.add(k2); fresh.append(m)
        if len(seen) > 6000: seen = set(list(seen)[-3000:])
        n = post(fresh)
        if n: print(time.strftime("%H:%M:%S"), f"{captured} window(s) +{n}", " · ".join(f'{m["username"]}→{m["channel"]}' for m in fresh[:3]))
        time.sleep(15)

if __name__ == "__main__": main()
