# Deploying Market Bubble

The system is **two services** that must both be online:

| Part | What it is | Where it goes | Why |
| --- | --- | --- | --- |
| `web/` | Next.js site | **Vercel** | static + serverless, perfect fit |
| `server/` | Persistent WebSocket + HTTP hub | **Render** (or Railway/Fly/VPS) | holds long-lived sockets — Vercel functions can't |

The site talks to the hub over **`wss://`**. Because the Vercel site is HTTPS, a
plain `ws://` hub is blocked as mixed content — the hub host must give you TLS
(Render/Railway/Fly all do automatically).

---

## 1. Deploy the hub (do this first — the site needs its URL)

1. Push this repo to GitHub.
2. Render → **New + → Blueprint** → pick this repo. It reads `render.yaml` and
   creates `market-bubble-hub` from `server/Dockerfile`.
3. Render prompts for every secret env var. Fill them from your local
   `server/.env`, **plus** the two new ones:
   - `OPERATOR_KEY` → a strong random value: `openssl rand -hex 24`
   - `ALLOWED_ORIGINS` → your Vercel URL(s), e.g.
     `https://market-bubble.vercel.app` (add your custom domain too, comma-sep)
   - `WEB_ORIGIN` → your primary Vercel URL
4. Deploy. Confirm `https://<your-hub>.onrender.com/health` returns `ok`.
   Your hub WebSocket URL is then `wss://<your-hub>.onrender.com`.

## 2. Deploy the site (Vercel)

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory = `web`** (the repo is a monorepo).
3. Environment Variables:
   - `NEXT_PUBLIC_HUB_URL` = `wss://<your-hub>.onrender.com`
   - `NEXT_PUBLIC_TWITCH_CLIENT_ID` = your Twitch app client id
4. Deploy.

## 3. Point OAuth at production (or sign-in breaks)

- **Twitch** developer console → your app → **OAuth Redirect URLs**: add your
  production site origin (`https://<your-app>.vercel.app` and any custom domain).
  The Twitch login is browser-side (implicit flow), so the redirect is the site.
- **Kick** developer settings → your app → **Redirect URI**: set it to the hub's
  callback, `https://<your-hub>.onrender.com/auth/kick/callback`. Make sure the
  hub's `KICK_REDIRECT_URI` env (if set) matches exactly.

## 4. Verify

- Site loads, theme/boot fine.
- `/content` shows clips + streams + tweets (hub reachable over wss).
- Live chat connects; a viewer can sign into Twitch/Kick and send a message.
- `/studio` → enter your **production** `OPERATOR_KEY` → channel/look controls work.

---

## Security reminders (already enforced in code)

- `OPERATOR_KEY` gates every privileged action — keep it strong and secret.
- `ALLOWED_ORIGINS` must list **only** your real domains (blocks cross-site
  WebSocket hijacking). Don't use `*`.
- Never commit `server/.env` (it's gitignored). Set secrets in the host's
  dashboard, not in the repo.
- Rotate any token that has ever been pasted somewhere shared.
