#!/usr/bin/env python3
"""Market Bubble — X broadcast chat → site, via window OCR.
Captures EVERY Chrome window showing an X live broadcast (Banks, Ansem,
Market Bubble — all at once) and OCRs each chat panel on-device, pushing new
lines to the hub to join the unified Twitch/Kick/X feed. Also reads each
broadcast's "watching" count and pushes the total as the X live audience.

Each broadcast must be the ACTIVE tab in its OWN Chrome window.

Capture comes from the MBCapture helper app (persistent ScreenCaptureKit
streams, the OBS technique): windows can be fullscreen, on other desktops/
Spaces, or buried behind anything. The ONLY forbidden state is MINIMIZED to
the Dock — macOS stops maintaining a minimized window's image, for everyone.
If the helper isn't running the bridge falls back to legacy `screencapture`,
which additionally needs the windows on the CURRENT desktop, not fullscreen.

One-time setup: System Settings → Privacy & Security → Screen Recording →
enable MBCapture (and Terminal for the fallback). Then ./xchat-watch.command
(the launcher starts MBCapture automatically).
"""
import subprocess, sys, json, re, time, os, urllib.request

HUB = os.environ.get("MB_HUB", "https://market-bubble-hub.onrender.com")
KEY = os.environ.get("MB_INGEST_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
HERE = os.path.dirname(os.path.abspath(__file__))
OCR, WINFIND = os.path.join(HERE, "ocr"), os.path.join(HERE, "winfind")
HANDLE = re.compile(r"@(\w{2,15})")
BLOCK = {h.lower() for h in (os.environ.get("MB_BLOCK", "Banks,blknoiz06,Polymarket,marketbbl")).split(",")}
# which broadcaster a window belongs to → the label shown as the chat source.
# Extendable for testing against any live channel:
#   MB_BROADCASTERS="somehandle:Some Label,other:Other" ./xchat-watch.command
BROADCASTERS = {"banks": "Banks", "blknoiz06": "Ansem", "marketbbl": "Market Bubble",
                "marketbubble": "Market Bubble"}
for pair in (os.environ.get("MB_BROADCASTERS", "") or "").split(","):
    if ":" in pair:
        h, label = pair.split(":", 1)
        if h.strip(): BROADCASTERS[h.strip().lower()] = label.strip()
# exact UI strings that are NEVER chat messages, + ticker/disclaimer/promo junk
UI = re.compile(r"^(ask gemini|chat|subscribe|resubscribe|send a message|follow|gift a sub|"
                r"\.\.\.|los angeles|new york|-? ?polymarket|bubbl|bubh|ubl|sign up|copy the best|\W*)$", re.I)
JUNK = re.compile(r"(\d{1,2}:\d{2}\s*(pm|am|et|pt)\b|informational and entertain|not constitute|"
                  r"[+\-]\d+\.\d+\s*%|\$\d{3,}|presented by|polymarket|bubble20|app store|"
                  r"this broadcast has ended|"
                  r"\b[A-Z]{2,5}\s+\d+\.\d{2}|©\s*[A-Z]|[▲▼]\s*\d|\d+\.\d{2}\s*\(?[+\-]\d)", re.I)
WATCHING = re.compile(r"([\d.,]+\s*[KkMm]?)\s*watching", re.I)
# Short cycle = small frequent batches; the hub drips each batch out one message
# at a time, so the site chat flows like a real live chat instead of clumping.
CYCLE_SECS = 6

def parse_count(s):
    s = s.strip().replace(",", "").upper()
    mult = 1
    if s.endswith("K"): mult, s = 1000, s[:-1]
    elif s.endswith("M"): mult, s = 1000000, s[:-1]
    try: return int(float(s) * mult)
    except ValueError: return 0

def broadcast_windows():
    """(corner_x, corner_y, broadcast_id) for every Chrome broadcast window (URL read)."""
    js = ('tell application "Google Chrome"\n set out to ""\n repeat with w in windows\n'
          '  try\n   set u to URL of active tab of w\n   if u contains "broadcasts/" then\n'
          '    set b to bounds of w\n    set out to out & (item 1 of b as text) & "," & (item 2 of b as text) & "," & u & "\n"\n'
          '   end if\n  end try\n end repeat\n return out\nend tell')
    try:
        r = subprocess.run(["osascript", "-e", js], capture_output=True, text=True, timeout=8).stdout.strip()
    except subprocess.TimeoutExpired:
        return []   # Chrome busy/dialog up — fall back to title identification
    out = []
    for line in r.splitlines():
        try:
            x, y, url = line.split(",", 2)
            m = re.search(r"broadcasts/([A-Za-z0-9]+)", url)
            out.append((int(x), int(y), m.group(1) if m else url))
        except Exception: pass
    return out

def chrome_windows():
    """All Chrome windows from the window server: id, bounds, title (no AppleScript)."""
    try:
        return json.loads(subprocess.run([WINFIND], capture_output=True, text=True).stdout or "[]")
    except Exception:
        return []

def is_x_page(title):
    t = (title or "").lower()
    return "/ x" in t or t.rstrip().endswith("· x")

def is_broadcast_title(title):
    """An X page that is NOT a status post ('Account on X: "..."') or a profile
    ('Name (@handle) / X') — i.e. plausibly a live/replay broadcast view. The
    OCR host-card makes the final attribution; this only picks capture targets
    when the AppleScript URL read is unavailable."""
    t = (title or "").lower()
    if not is_x_page(t): return False
    if " on x:" in t: return False        # a status/post page
    if re.search(r"\(@\w+\)\s*/ x", t): return False   # a profile page
    return True

def title_label(title):
    """Broadcaster label from the window title, when it happens to be there."""
    t = (title or "").lower()
    if not is_x_page(t): return None
    for handle, label in BROADCASTERS.items():
        if handle in t or label.lower() in t:
            return label
    return None

MBCAP = "/tmp/mbcap"
def mbcap_meta():
    """MBCapture helper's captured-window list — None when the helper is dead
    (meta.json stale). The helper rewrites meta every cycle (~3s)."""
    try:
        p = MBCAP + "/meta.json"
        if time.time() - os.path.getmtime(p) > 20: return None
        with open(p) as f: return json.load(f)
    except Exception:
        return None

def capture_targets():
    """Each open broadcast window → window id + broadcast id + title label.
    Re-resolved EVERY cycle, so reopened windows just work.

    Preferred source: the MBCapture helper (works across Spaces/fullscreen).
    Its titles are complete (the window server truncates), so title
    identification is reliable and we skip the AppleScript URL read entirely.
    Fallback: window-server list + screencapture (same-desktop only)."""
    meta = mbcap_meta()
    if meta is not None:
        return [{"id": m["id"], "w": m["w"], "h": m["h"], "bid": m["id"],
                 "tlabel": title_label(m.get("title")),
                 "png": f"{MBCAP}/{m['id']}.png", "frame_t": m.get("t", 0)}
                for m in meta
                if m["w"] >= 700 and m["h"] >= 450 and is_broadcast_title(m.get("title"))]
    wins = chrome_windows()
    big = [w for w in wins if w["w"] >= 700 and w["h"] >= 450]
    bw = broadcast_windows()
    targets = []
    if bw:
        for px, py, bid in bw:
            m = min(big or wins, key=lambda w: abs(w["x"]-px)+abs(w["y"]-py), default=None)
            if m: targets.append({**m, "bid": bid, "tlabel": title_label(m.get("title"))})
    else:                                # URL read failed → identify by title only.
        # Any big X window that isn't a status/profile page is a broadcast
        # candidate; the OCR host-card attributes it. Never unrelated windows.
        targets = [{**w, "bid": w["id"], "tlabel": title_label(w.get("title"))}
                   for w in big if is_broadcast_title(w.get("title"))]
    return targets

def capture(w):
    """MBCapture targets carry their frame path — the helper already captured
    them (atomic rename, safe to read). Legacy targets go through
    `screencapture` by window id ONLY. No region fallback: when -l fails the
    window is minimized / on another desktop / display asleep, and a region
    grab would OCR whatever happens to be on the current screen — junk in the
    site chat."""
    if w.get("png"):
        return w["png"] if os.path.exists(w["png"]) else None
    shot = "/tmp/mb_xcap.png"
    try: os.remove(shot)
    except OSError: pass
    subprocess.run(["screencapture", "-x", "-o", "-l", str(w["id"]), shot], capture_output=True)
    return shot if os.path.exists(shot) else None

def ocr(png):
    try:
        out = subprocess.run([OCR, png], capture_output=True, text=True, timeout=30).stdout
        return stitch_rows(json.loads(out))
    except Exception:
        return []

def stitch_rows(lines, ytol=0.008, gap=0.03):
    """Vision (especially tiled over wide frames) splits one visual row —
    'Adam McBride ✓ @adamamcbride' — into adjacent fragments. Cluster lines
    that sit on the same y, order each cluster by x, and re-join fragments
    that nearly touch, so the parser sees rows the way single-pass OCR
    returned them. Distant fragments (video captions, Following buttons,
    panel padding) stay separate lines."""
    lines = sorted(lines, key=lambda l: l.get("y", 0))
    out, i = [], 0
    while i < len(lines):
        cluster = [lines[i]]
        j = i + 1
        while j < len(lines) and lines[j].get("y", 0) - cluster[-1].get("y", 0) < ytol:
            cluster.append(lines[j]); j += 1
        i = j
        cluster.sort(key=lambda l: l.get("x", 0))
        merged = [dict(cluster[0])]
        for l in cluster[1:]:
            prev = merged[-1]
            if 0 <= l.get("x", 0) - (prev["x"] + prev.get("w", 0)) < gap:
                prev["text"] += " " + l["text"]
                prev["w"] = (l["x"] + l.get("w", 0)) - prev["x"]
            else:
                merged.append(dict(l))
        out.extend(merged)
    out.sort(key=lambda l: l.get("y", 0))
    return out

_bc_cache = {}
ANCHOR = re.compile(r"started|subscribe|follow|\bago\b|\blive\b", re.I)
def broadcaster_of(lines, bid=None, tlabel=None):
    """Stream attribution, most→least trustworthy:
      1. the OCR'd broadcaster card — a known @handle NEAR a Started/Subscribe/
         Follow anchor (the host card; not the watermark, not the title)
      2. the cache from an earlier frame where the card was visible
      3. the window title — LAST because broadcast titles often mention the
         other hosts ("LIVE WITH BANKS" on Ansem's stream would mislabel it).
    "Left" = everything left of the chat column, derived from the frame itself:
    a fixed 0.58 misses the host card on fullscreen windows (wider video)."""
    col = chat_column_start(lines)
    left = [l for l in lines if l.get("x", 1) < col - 0.02]
    for i, l in enumerate(left):
        m = HANDLE.search(l["text"])
        if not m or m.group(1).lower() not in BROADCASTERS: continue
        near = any(ANCHOR.search(left[j]["text"]) for j in range(max(0, i-2), min(len(left), i+3)))
        if near:
            label = BROADCASTERS[m.group(1).lower()]
            if bid is not None: _bc_cache[bid] = label
            return label
    cached = _bc_cache.get(bid)   # remembered from a frame where the card was visible
    if cached: return cached
    if tlabel and bid is not None: _bc_cache[bid] = tlabel
    return tlabel

def watching_count(lines):
    """The broadcast's live "N watching" count, read off the video side
    (anything left of the chat column — fullscreen pushes it past 0.6)."""
    col = chat_column_start(lines)
    for l in lines:
        if l.get("x", 1) < col - 0.02:
            m = WATCHING.search(l["text"])
            if m:
                n = parse_count(m.group(1))
                if n: return n
    return 0

def chat_column_start(lines):
    """Where the chat panel begins, anchored to the OCR'd "Chat" header itself —
    a fixed threshold swallows the right edge of the VIDEO (tile captions like
    "BANKS", the Polymarket banner) and glues them into messages."""
    for l in lines:
        if l.get("x", 0) > 0.5 and l["text"].strip().lower() in ("chat", "char", "chai"):
            # the header sits 0.02–0.05 right of where message rows start,
            # varying with window width — cut generously left of it
            return max(0.58, l["x"] - 0.06)
    return 0.7

def parse(lines, source):
    col = chat_column_start(lines)
    chat = sorted([l for l in lines if l.get("x", 0) > col], key=lambda l: l["y"])
    txt = [l["text"] for l in chat]
    hidx = [i for i, t in enumerate(txt) if HANDLE.search(t)]   # @handle line indices
    msgs = []
    for n, i in enumerate(hidx):
        user = HANDLE.search(txt[i]).group(1)
        if user.lower() in BLOCK: continue
        nxt = hidx[n + 1] if n + 1 < len(hidx) else len(txt)
        body = []
        for k in range(i + 1, nxt):
            # skip fragments of the NEXT message's name row (same visual row
            # as its handle — OCR sometimes splits "Name ✓ @handle" in two)
            if nxt < len(txt) and abs(chat[k]["y"] - chat[nxt]["y"]) < 0.006: continue
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
    if not msgs: return 0, None
    req = urllib.request.Request(HUB + "/ingest/xchat", data=json.dumps({"messages": msgs}).encode(),
        headers={"content-type": "application/json", "x-ingest-key": KEY})
    try: return json.loads(urllib.request.urlopen(req, timeout=10).read()).get("pushed", 0), None
    except Exception as e: return 0, str(e)

def post_xlive(total):
    """Total live viewers across all captured broadcasts → the site's X count.
    Same /ingest/xlive endpoint + shape the hub has always accepted."""
    req = urllib.request.Request(HUB + "/ingest/xlive",
        data=json.dumps({"live": total > 0, "viewers": total}).encode(),
        headers={"content-type": "application/json", "x-ingest-key": KEY})
    try: urllib.request.urlopen(req, timeout=10).read(); return None
    except Exception as e: return str(e)

def notify(msg):
    """Loud macOS notification — for when a stream silently dies mid-show."""
    try:
        subprocess.run(["osascript", "-e",
            f'display notification "{msg}" with title "MB X Bridge" sound name "Basso"'],
            capture_output=True, timeout=5)
    except Exception: pass

# ---------------- live terminal HUD ----------------
class Hud:
    def __init__(self):
        self.streams = {}   # label -> {last_msg, watching, ok, win}
        self.events = []    # rolling event log
        self.push_err = None
        self.started = time.time()
        self.pushed_total = 0
        self.mbcap = False  # capturing via the MBCapture helper?

    def event(self, line):
        self.events.append(time.strftime("%H:%M:%S ") + line)
        self.events = self.events[-6:]

    def draw(self, capturing):
        now = time.time()
        out = ["\x1b[2J\x1b[H"]  # clear + home
        mode = ("MBCapture · fullscreen/any desktop OK, just not minimized" if self.mbcap
                else "LEGACY · windows must be on THIS desktop, not fullscreen/minimized")
        out.append("MARKET BUBBLE — X BRIDGE        up %dm · pushed %d msgs · hub %s" % (
            (now - self.started) // 60, self.pushed_total, HUB.split("//")[1]))
        out.append("  capture: " + mode)
        out.append("─" * 72)
        if not self.streams:
            out.append("  (no broadcast windows found — open each X broadcast in its OWN")
            out.append("   Chrome window; fullscreen/hidden is fine, minimized is not)")
        for label, s in sorted(self.streams.items()):
            age = (now - s["last_msg"]) if s["last_msg"] else None
            frozen = s.get("frozen")
            if not s["ok"]:
                icon, note = "❌", "WINDOW LOST — reopen the broadcast window"
            elif frozen:
                icon, note = "⚠️ ", f"frames frozen {int(frozen)}s — window MINIMIZED? un-minimize it (fullscreen is fine)"
            elif age is None:
                icon, note = "⚠️ ", "capturing, no chat read yet"
            elif age > 120:
                icon, note = "⚠️ ", f"no new chat for {int(age)}s"
            else:
                icon, note = "✅", f"last chat {int(age)}s ago"
            watch = f"{s['watching']:,} watching" if s["watching"] else "—"
            out.append(f"  {icon} {label:<14} {watch:<18} {note}")
        out.append("─" * 72)
        if self.push_err:
            out.append(f"  ⚠️  last push error: {self.push_err[:60]} (auto-retries next cycle)")
        for e in self.events:
            out.append("  " + e)
        out.append("")
        out.append("  Ctrl-C to stop. Keep this Mac awake (launcher runs caffeinate).")
        sys.stdout.write("\n".join(out) + "\n")
        sys.stdout.flush()

SEEN_FILE = "/tmp/mb_xseen.json"
def seen_key(user, text):
    """Dedup key that survives OCR jitter: lowercase, strip everything but
    word characters + the symbols chatters actually type, cap the length so
    a re-read with a different trailing crumb still matches."""
    t = re.sub(r"[^a-z0-9$@#?!]", "", text.lower())[:48]
    return user.lower() + ":" + t

def load_seen():
    """Pushed-message memory persists across restarts — a fresh process must
    NOT re-push the chat that's already on the site."""
    try:
        with open(SEEN_FILE) as f: return set(json.load(f))
    except Exception:
        return set()

def save_seen(seen):
    try:
        with open(SEEN_FILE + ".tmp", "w") as f: json.dump(list(seen)[-4000:], f)
        os.replace(SEEN_FILE + ".tmp", SEEN_FILE)
    except Exception: pass

def main():
    if not KEY: sys.exit("Set MB_INGEST_KEY (or pass it as arg 1).")
    hud = Hud()
    seen = load_seen()
    hud.event(f"bridge started → {HUB}" + (f" · remembering {len(seen)} pushed msgs" if seen else ""))
    while True:
        try:
            mb = mbcap_meta() is not None
            if mb != hud.mbcap:
                hud.mbcap = mb
                if mb:
                    hud.event("✅ MBCapture helper online — fullscreen/any-desktop capture")
                else:
                    hud.event("❌ MBCapture helper DOWN — legacy capture: windows must be on THIS desktop")
                    notify("MBCapture helper stopped — X windows must be on the current desktop!")
            targets = capture_targets()
            # mark streams whose windows vanished; notice the ones that came back
            live_labels = set()
            fresh, total_watching = [], 0
            for w in targets:
                shot = capture(w)
                if not shot:
                    hud.event(f"window {w['id']} not capturable — minimized or on ANOTHER DESKTOP; "
                              "bring it to this desktop (hidden behind apps is fine)")
                    continue
                lines = ocr(shot)
                source = broadcaster_of(lines, w["bid"], w.get("tlabel"))
                label = source or f"window {w['id']}"
                live_labels.add(label)
                st = hud.streams.setdefault(label, {"last_msg": 0, "watching": 0, "ok": True, "win": w["id"]})
                if not st["ok"]:
                    st["ok"] = True
                    hud.event(f"✅ {label} window is back")
                    notify(f"{label} stream window is back")
                st["win"] = w["id"]
                # MBCapture frame age: a live chat always moves, so frames that
                # stop for 90s+ mean the window was minimized (or the page died).
                frame_age = (time.time() - w["frame_t"]) if w.get("frame_t") else 0
                was_frozen = st.get("frozen")
                st["frozen"] = frame_age if frame_age > 90 else None
                if st["frozen"] and not was_frozen:
                    hud.event(f"⚠️ {label} frames frozen — window minimized? un-minimize it")
                    notify(f"{label} window frames frozen — minimized? Un-minimize it (fullscreen is fine)")
                n = watching_count(lines)
                if n: st["watching"] = n
                total_watching += st["watching"]
                for m in parse(lines, source):
                    k2 = seen_key(m["username"], m["text"])
                    if k2 not in seen:
                        seen.add(k2); fresh.append(m)
                        st["last_msg"] = time.time()
            # anything we tracked but didn't capture this cycle = lost window
            for label, st in hud.streams.items():
                if label not in live_labels and st["ok"]:
                    st["ok"] = False
                    hud.event(f"❌ {label} WINDOW LOST")
                    notify(f"{label} stream window LOST — reopen it!")
            if len(seen) > 6000: seen = set(list(seen)[-3000:])
            n, err = post(fresh)
            if fresh and not err: save_seen(seen)
            hud.pushed_total += n
            hud.push_err = err
            if err: hud.event(f"chat push failed: {err[:50]}")
            if total_watching:
                xerr = post_xlive(total_watching)
                if xerr and not err: hud.push_err = xerr
            hud.draw(len(targets))
            # publish state for the local control panel (mbpanel.py)
            try:
                with open("/tmp/mb_bridge_state.json.tmp", "w") as f:
                    json.dump({"streams": hud.streams, "events": hud.events,
                               "mbcap": hud.mbcap, "pushed": hud.pushed_total,
                               "push_err": hud.push_err, "started": hud.started,
                               "t": time.time()}, f)
                os.replace("/tmp/mb_bridge_state.json.tmp", "/tmp/mb_bridge_state.json")
            except Exception: pass
        except KeyboardInterrupt:
            print("\nstopped.")
            return
        except Exception as e:
            hud.event(f"cycle error (continuing): {str(e)[:60]}")
            try: hud.draw(0)
            except Exception: pass
        time.sleep(CYCLE_SECS)

if __name__ == "__main__": main()
