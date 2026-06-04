# Market Bubble — Unified Live Chat

Twitch + X + Kick chat fanned into **one real-time feed** with per-source labels,
colors, and live connection indicators — plus a **transparent stream overlay**
you drop into OBS / Streamlabs as a Browser Source.

The browser opens **one** WebSocket to a small Node aggregator hub. The hub
connects to all three sources, normalizes every message to a single shape, and
pushes a unified stream down to every connected browser. **All API keys stay
server-side.**

```
                ┌──────────────── Node aggregator hub ────────────────┐
 Browser  ──ws──▶  Twitch  (anon IRC-over-WS, wss://irc-ws.chat...)    │
 (Next.js)      │  Kick    (server fetch chatroom id → Pusher socket)  │
                │  X       (poll /2/tweets/search/recent every 12s)    │
                └─────────────────────────────────────────────────────┘
```

## Unified message format

Every source is normalized to this before it reaches a browser:

```ts
{ source: "twitch" | "kick" | "x", username, text, timestamp, color, fragments }
```

Colors: Twitch `#9146FF`, Kick `#53FC18`, X `#FFFFFF`.

`fragments` is an ordered list the browser renders inline so emotes show as
images, not text: `{ type: "text", text }` or `{ type: "emote", name, url }`
(`null` when there's nothing to tokenize). The hub resolves five emote sources:

| Emote kind | How it's resolved | Image CDN |
| --- | --- | --- |
| **Twitch native** | the IRCv3 `emotes` tag (the hub sends `CAP REQ :twitch.tv/tags` so Twitch includes it), codepoint-indexed into the text | `static-cdn.jtvnw.net` |
| **Kick native** | inline `[emote:id:name]` codes parsed out of the message body | `files.kick.com` |
| **7TV** | per-channel set fetched from `7tv.io` (Twitch by `room-id`, Kick by `user_id`) + the global set, whole-word matched | `cdn.7tv.app` |
| **BTTV** | global set + Twitch channel/shared sets from `betterttv.net`, whole-word matched | `cdn.betterttv.net` |
| **FFZ** | global set + Twitch room set from `frankerfacez.com`, whole-word matched | FFZ-hosted urls |

Unicode emojis need no handling — they pass through as text and render natively.
The 7TV/BTTV/FFZ maps are merged per channel (FFZ → BTTV → 7TV, so 7TV wins
name collisions). BTTV and FFZ channel sets are Twitch-only; their global sets
still apply on every platform. All sets are fetched once and cached; failures
(e.g. a channel with no 7TV/BTTV/FFZ room) fail soft to global-only, so chat
never blocks on emote lookups.

## How each source works

| Source | Mechanism | Real-time? | Auth |
| --- | --- | --- | --- |
| **Twitch** | Anonymous IRC over WebSocket (`wss://irc-ws.chat.twitch.tv:443`), connects as `justinfanNNNN`, `NICK` + `JOIN`, parses `PRIVMSG` | True stream | None / free |
| **Kick** | Server-side resolve `kick.com/api/v2/channels/{slug}` → chatroom id → Kick Pusher socket, channel `chatrooms.{id}.v2`, event `App\Events\ChatMessageEvent` | True stream | None |
| **X** | Poll `GET /2/tweets/search/recent` every 12s, dedupe by tweet id via `since_id`, emit only new tweets | Near-real-time (polling) | Bearer token (env) |

> X removed fixed Basic/Pro tiers for new devs, so the only generally-available
> option is pay-as-you-go polling — there is no true stream here by design.

> **Kick + Cloudflare:** the chatroom-id lookup sits behind Cloudflare, which
> fingerprints TLS + HTTP/2. Node's `fetch`/`https` get a 403 no matter the
> headers, but `curl --http1.1` with a browser UA passes — so the hub shells out
> to `curl` for that one lookup (present on macOS and Railway's Nixpacks images),
> falling back to `fetch`. If a host lacks `curl` or Cloudflare hardens further,
> set `KICK_CHATROOM_ID` in the env to skip the lookup entirely.

## Project layout

```
server/   Node WebSocket aggregator hub (no framework, just `ws`)
web/      Next.js frontend (single live feed)
```

---

## Run locally

You need **Node 18+** (uses the built-in `fetch`).

### 1. Start the hub

```bash
cd server
cp .env.example .env        # then edit .env
npm install
npm run dev                  # or: npm start
```

Edit `server/.env`:

```bash
PORT=8080
TWITCH_CHANNEL=xqc
KICK_CHANNEL=trainwreckstv
X_QUERY=@nasa -is:retweet
X_BEARER_TOKEN=             # leave blank to disable the X source
X_POLL_INTERVAL_MS=12000
```

- The hub runs fine with **no** X token — the X indicator just shows
  "disabled (no token)" and the other two sources stream normally.
- `GET http://localhost:8080/health` returns current status as JSON.

### 2. Start the frontend

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

`web/.env.local`:

```bash
NEXT_PUBLIC_HUB_URL=ws://localhost:8080
```

Open <http://localhost:3000>. This is the **control panel**: connection
indicators, channel inputs, overlay-style controls, a live preview, and a
copyable overlay link. As each source connects its dot flips green and messages
flow into the preview (newest at the bottom, auto-scrolling).

### Changing channels without restarting

Use the inputs at the top of the page (Twitch channel / Kick channel / X query)
and hit **Apply** (or press Enter). The hub tears down and rebuilds its source
connections live and pushes fresh status to every client.

---

## Stream overlay (OBS / Streamlabs)

The whole point: show this chat on stream. There's a dedicated, **transparent**
overlay route designed to be an OBS/Streamlabs **Browser Source**.

1. On the control panel, set your channels and tweak the look (badge style,
   background, text size, watermark, text shadow). The **Live preview** is
   exactly what viewers will see.
2. Under **Add to your stream**, hit **Copy link**. It looks like:
   `http://localhost:3000/overlay?badge=full&bg=none&shadow=1&size=lg&brand=logo&twitch=ansem&kick=xqc&xq=%40MarketBubble`
3. OBS → **Sources → + → Browser** → paste the link. Suggested size **420×720**.
   Streamlabs is identical (Add Source → Browser Source).
4. The page background is transparent, so it composites cleanly over your scene.

The link is **self-contained** — it carries both the channels and the styling,
and tells the hub which channels to follow on connect. The hub just has to be
running and reachable (locally `ws://localhost:8080`, or your hosted URL via
`NEXT_PUBLIC_HUB_URL`).

### Overlay link options

| Param | Values | What it does |
| --- | --- | --- |
| `badge` | `full` · `logo` · `text` · `dot` | Logo + name / logo only / name only / color dot |
| `bg` | `glass` · `solid` · `none` | Background behind each line (`none` = no box, just text) |
| `shadow` | `1` · `0` | Text shadow for readability over gameplay |
| `size` | `sm` · `md` · `lg` | Chat text size |
| `brand` | `off` · `logo` · `full` | Market Bubble watermark (off / logo / logo + name) |
| `max` | number | Max lines kept on screen (default 40) |
| `twitch`, `kick`, `xq` | channel / slug / query | Which channels this overlay follows |

You normally never hand-write these — the control panel builds the link for you.

---

## Demo tips

- Pick channels that are **currently live** — an offline Twitch/Kick channel
  connects fine but has little/no chat. Big always-on channels (e.g. `xqc`,
  `trainwreckstv`) are good for showing all three lit up at once.
- Kill the hub process and watch every indicator go red, then restart it and
  watch them auto-recover — the browser reconnects with backoff on its own.

---

## Deploy

### Server → Railway

1. Push this repo to GitHub.
2. New Railway project → **Deploy from repo** → set **root directory** to
   `server`.
3. Add the env vars from `server/.env.example` (`TWITCH_CHANNEL`,
   `KICK_CHANNEL`, `X_QUERY`, `X_BEARER_TOKEN`, etc.). Railway provides `PORT`
   automatically; the server reads it.
4. Railway gives you a public domain. The WebSocket URL is the same host with
   `wss://`, e.g. `wss://your-app.up.railway.app`.

`server/railway.json` is included (Nixpacks build, `npm start`, auto-restart on
failure).

### Frontend → Vercel

1. New Vercel project → import the repo → set **root directory** to `web`.
2. Add env var `NEXT_PUBLIC_HUB_URL` = `wss://your-app.up.railway.app`.
3. Deploy. Next.js is auto-detected.

> Use `wss://` (not `ws://`) in production so the secure Vercel page can open the
> socket without mixed-content errors.

Once deployed, the **Copy link** button automatically produces a public overlay
URL (`https://your-frontend.vercel.app/overlay?...`) — paste that straight into
OBS and it works from any machine, no local hub required.

---

## Reliability notes

- **Auto-reconnect everywhere.** Each source wraps its socket with exponential
  backoff (1s → 30s). The browser reconnects to the hub the same way (1s → 15s).
- **Status is real, not faked.** Indicators reflect actual socket/Pusher
  connection state pushed from the hub, not a hardcoded "connected".
- **Keys stay server-side.** The X bearer token only ever lives in the hub's
  environment; the browser never sees it.
