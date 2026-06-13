# Show-Day Runbook — Market Bubble live

The show goes live **Thursdays 1PM PST**. They may feature the site on-air, so
the goal is: **everything green before they say the URL.**

## T-minus 1 hour (≈12:00)
- [ ] **Code freeze.** No deploys today. (Last safe deploy: the night before.)
- [ ] Decide on Render: if a big simultaneous spike is expected when the URL
      hits air, bump the hub off free tier for the day. The *code* handles
      thousands of viewers (load-tested: 2,500 clients, 0 drops) — the free
      instance's CPU/bandwidth cap is the only risk.

## T-minus 30 min (≈12:30) — the X bridge (your job)
1. **Kill any local hub** on :8080 (`lsof -ti :8080 | xargs kill`). A local hub
   with the prod X token steals the single X stream slot → prod X dies.
2. Open the **3 X broadcast windows** (Banks, Ansem, Market Bubble), each in
   its **own Chrome window**. With the MBCapture helper (auto-started by the
   launcher) the rules are simple:
   - **Green-button fullscreen each one** — that's the tidy setup: each
     broadcast lives on its own desktop you never visit. Other desktops or
     buried behind apps also work. Work wherever you want, fullscreen
     anything you want.
   - **The ONLY forbidden state is MINIMIZED** (yellow button / Dock). macOS
     stops drawing minimized windows — nothing can capture them. The HUD
     and a loud notification will call it out if you slip.
   - Display stays awake (the launcher runs caffeinate).
3. Start the bridge: double-click `tools/x-bridge/xchat-watch.command`.
   The HUD header must say **`capture: MBCapture`** — if it says LEGACY, the
   helper isn't running: `open /Applications/MBCapture.app` (if macOS asks,
   System Settings → Privacy & Security → Screen Recording → MBCapture ON —
   only ever needed again if the helper app was rebuilt).
   Each stream line should go ✅ with "last chat Ns ago" ticking. ❌ = the
   HUD tells you exactly what to fix; lost windows also fire a macOS
   notification with sound.

## T-minus 15 min — verify (open `/studio`)
The **health strip** at the top should be all green:
- [ ] **Hub** — up, shows viewer count climbing
- [ ] **Twitch src** — `fazebanks`
- [ ] **Kick src** — `ansem`
- [ ] **X bridge** — "chat <2 min ago" (turns green once the bridge pushes)
- [ ] **Viewer counts** — fresh (<2 min)

If a chip is red, it tells you exactly what's broken. Channels are baked into
Render env now, so a hub restart won't blank them — but if Studio shows wrong
channels, re-apply them there.

## On air
- The two on-stream surfaces: **fullscreen chat** (Live Room → turn Stream +
  Views off → ⤢ for true fullscreen, or use the `/overlay` link in OBS) and the
  **dashboard** (Live Room with everything on).
- Touch nothing once it's running.

## If something breaks mid-show
- **X chat stops** → look at the bridge HUD, it names the problem:
  - `capture: LEGACY` → MBCapture died: `open /Applications/MBCapture.app`
  - `frames frozen — window MINIMIZED?` → un-minimize that broadcast window
    (fullscreen it instead)
  - `WINDOW LOST` → the broadcast window/tab was closed; reopen the broadcast
  - Bridge Terminal itself gone → double-click `xchat-watch.command` again.
- **Viewer count stuck** → the X live count comes from the bridge; same fix.
- **Whole site dead** → check `https://market-bubble-hub.onrender.com/status`.
  If it 503s, the Render instance is overwhelmed → upgrade tier.

## Quick links
- Health: `https://market-bubble-hub.onrender.com/status`
- Site: `https://market-bubble-nine.vercel.app`
- Studio: `https://market-bubble-nine.vercel.app/studio`
