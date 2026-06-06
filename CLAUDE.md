# Market Bubble — project rules & context

Site + live chat for FaZe Banks & Ansem's live trading show. Brand is
print/editorial: paper / envelope / newspaper / letterpress with grain. The
`premium-site-craft` global skill carries the full hard-rules playbook — this
file is the always-on project specifics. **Follow both.**

## Layout
- `web/` — Next.js 14 app router (the site). Dev: `cd web && npm run dev` → http://localhost:3000
- `server/` — Node WS + HTTP hub. Run: `cd server && npm start` (`node index.js`) → port 8080
- Hub HTTP base is exposed to the web app via `useHub()` → `hubHttpUrl`.

## Brand (non-negotiable)
- **Dark mode = warm "after-hours newsprint"**, NOT cold blue-black. Tokens in
  `web/app/globals.css` `:root`: `--bg:#1a1917`, `--text:#f4efe4`,
  `--up:#5aa873`, `--down:#cc5a45`. Light = cream paper (`--up:#2f7d52`,
  `--down:#b03f2c`). Get BOTH modes right.
- Site-wide paper **grain** overlay (`GrainOverlay`). Brand serif = Playfair
  (`--serif`).
- Real logo vectors live in `web/public/mb-icon.svg` (2-peak speech bubble) and
  `web/public/mb-logotype.svg`. Use them VERBATIM. Render as `currentColor` CSS
  masks (`.mb-mark`) so they theme; boot uses a preloaded `<img>`.
- Theme toggle = instant swap / localized View Transitions circular reveal — no
  full-page color crossfade (it lags).

## Boot (`web/app/components/BootSequence.tsx`) — handle with care
- Letterpress stamp on paper, **idle-gated** via `requestIdleCallback` (CSS
  animation clock burns during load otherwise → "no animation, just there").
- Run-once per session via `sessionStorage("mb.booted")` set at the END of the
  effect (StrictMode double-invokes). Re-stamps the header logo on exit.
- Only animate `transform`/`opacity`. Never animate `filter`/`mask`/`clip-path`
  on the logo. Verify in a REAL foreground/incognito tab — occluded tabs freeze
  animations.

## Content feature (live data)
- `/content` page → `web/app/components/ContentBoard.tsx`, editorial "Dispatch"
  layout (deliberately NOT the competitor's 3-column). Hosts: Banks (@Banks),
  Ansem (@blknoiz06); avatars via unavatar.io.
- Auto-updates: fetches `${hubHttpUrl}/content` on load + every 2 min, **falls
  back to curated** data in `web/app/lib/showContent.ts`.
- Hub side: `server/sources/content.js` (`fetchContent`) + `/content` route in
  `server/index.js`. Pulls Twitch clips+VODs via Helix, reuses the existing
  Twitch app creds, 5-min server cache, CORS `*`.

## Secrets & git (never violate)
- `server/.env` is gitignored and holds ALL secrets: `TWITCH_CLIENT_ID/SECRET`,
  `X_BEARER_TOKEN`, `KICK_CLIENT_ID/SECRET`, `KICK_CHANNEL=ansem`. NEVER commit
  it or echo its values.
- Commit/push ONLY when asked. Branch off `main` (`feat/...`), never commit to
  main directly. End commit messages with the Co-Authored-By trailer.
- Current working branch: `feat/brand-rework-content-boot`.

## Live data (DONE — `/content` returns clips + streams + tweets)
- **Live tweets** — `server/sources/tweets.js` (`fetchTweets`). Queries each show
  account separately (`MarketBubble`, `Banks`, `blknoiz06`), market-topic filters
  (cashtags / % / market+show term regex with word boundaries), then round-robin
  `balance()` so the feed is evened across accounts (not Ansem-dominated). Strips
  t.co links + decodes HTML entities. Falls back to curated `TWEETS`.
- **Ansem's Kick** — `server/sources/kickContent.js` (`fetchKickContent`). Clips +
  VODs from Kick v2 API via browser-UA curl (Cloudflare). Merged with Twitch in
  the `/content` route; each item carries `source: "twitch"|"kick"` → badge on the
  thumbnail (purple Twitch / green Kick).

## X API COST (pay-per-use: $0.005 / post read; chat stream is the bigger spend)
- Cost = posts pulled per refresh × refreshes × $0.005. Knobs in `tweets.js`:
  `PER_HANDLE` (posts/account, default 10 = X minimum) and the `ttlMs` cache TTL
  (default **20 min**). Current = 3 accounts × 10 = 30 reads ≈ $0.15/refresh,
  max once per 20 min. KEEP `PER_HANDLE` LOW. Don't raise without a cost reason.
- The chat's X **filtered stream** (`sources/x.js`) reads every matched post too —
  that runs continuously during streams and is the larger ongoing X cost.

## Pending TODOs (next up)
1. Optional: filter junk auto clip titles further (Kick already drops ≤2-char).
2. Optional: live tweets currently market-filtered; revisit term list if good
   posts get dropped or junk slips through.

## Verify before claiming done
Build, load, observe in a real foreground tab; check `/content` returns 200 with
thumbnails that resolve. Don't assert "working" from memory.
