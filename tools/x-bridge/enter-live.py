#!/usr/bin/env python3
"""Enter a host's live X broadcast by clicking the LIVE ring on their profile.

Robust by design (the avatar is a big target, but window position/focus drift):
  1. raise the profile window to the FRONT (a click can't land on a buried window)
  2. read its live bounds, find the LIVE ring via OCR
  3. fire a small CLUSTER of clicks down the avatar's center line — one lands —
     checking after each and STOPPING the instant we're in (so we never click
     into the broadcast video itself)

Usage: enter-live.py <handle-substring>   e.g.  enter-live.py cueclips
"""
import subprocess, sys, json, time, os

HERE = os.path.dirname(os.path.abspath(__file__))
WINFIND = os.path.join(HERE, "winfind")
OCR = os.path.join(HERE, "ocr")
CLICKER = "/Applications/ClickHelper.app/Contents/MacOS/ClickHelper"

def windows():
    try:
        return json.loads(subprocess.run([WINFIND], capture_output=True, text=True, timeout=6).stdout or "[]")
    except Exception:
        return []

def find_window(handle):
    """The profile window for this handle (title still contains the @handle)."""
    for w in windows():
        t = (w.get("title") or "").lower()
        if handle.lower() in t and w.get("w", 0) > 700:
            return w
    return None

def raise_front(handle):
    """Bring the matching Chrome window to the front so it can receive clicks."""
    js = ('tell application "Google Chrome"\n activate\n repeat with w in windows\n'
          '  try\n   if (title of active tab of w) contains "%s" then set index of w to 1\n'
          '  end try\n end repeat\nend tell') % handle
    subprocess.run(["osascript", "-e", js], capture_output=True, timeout=8)
    time.sleep(0.8)

def click(x, y):
    subprocess.run([CLICKER, str(int(x)), str(int(y))], capture_output=True, timeout=5)

def entered(win_id, handle):
    """We're in once that window's title is no longer the profile (the broadcast
    view drops the '(@handle)' and becomes just 'X')."""
    for w in windows():
        if w["id"] == win_id:
            return handle.lower() not in (w.get("title") or "").lower()
    return True  # window id gone (navigated) → treat as entered

def main():
    handle = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not handle:
        print("usage: enter-live.py <handle>"); return 2
    w = find_window(handle)
    if not w:
        print(f"no window showing @{handle}"); return 1
    raise_front(handle)
    w = find_window(handle) or w           # re-read bounds after raising
    wx, wy, ww, wh = w["x"], w["y"], w["w"], w["h"]
    wid = w["id"]

    # Avatar center ≈ 0.32 x, 0.40 y of the window (measured live). Fire a cluster
    # biased downward (the ring shifts slightly down in fullscreen), widest target
    # first, checking after each click and stopping as soon as we're in.
    offsets = [(0.32, 0.40), (0.32, 0.43), (0.32, 0.37), (0.30, 0.40),
               (0.34, 0.40), (0.32, 0.46), (0.32, 0.34)]
    for i, (nx, ny) in enumerate(offsets):
        click(wx + nx * ww, wy + ny * wh)
        time.sleep(1.2)
        if entered(wid, handle):
            print(f"entered after click {i+1} at ({nx:.2f},{ny:.2f})")
            return 0
    print("clicked the cluster but didn't detect entry — re-check the window")
    return 1

if __name__ == "__main__":
    sys.exit(main())
