import crypto from "node:crypto";

// Kick OAuth 2.1 (authorization code + PKCE) and the authenticated API calls it
// unlocks: sending chat and moderation (timeout/ban). Kick requires the token
// exchange to use the client secret, so this all lives server-side. One Kick
// account is connected at a time (the operator's); moderation only works in
// channels that account actually moderates.

const AUTH_URL = "https://id.kick.com/oauth/authorize";
const TOKEN_URL = "https://id.kick.com/oauth/token";
const API = "https://api.kick.com/public/v1";
const SCOPES = "user:read channel:read chat:write moderation:ban";

const base64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function makePkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

// state -> { verifier, ts }, consumed on callback.
const pending = new Map();
// The single connected account's tokens.
let token = null; // { access_token, refresh_token, expires_at, scope }

export function kickConfigured(creds) {
  return Boolean(creds && creds.clientId && creds.clientSecret);
}

export function kickConnected() {
  return Boolean(token && token.access_token);
}

export function disconnectKick() {
  token = null;
}

export function buildKickLoginUrl(creds, redirectUri) {
  const { verifier, challenge } = makePkce();
  const state = base64url(crypto.randomBytes(16));
  pending.set(state, { verifier, ts: Date.now() });
  // Drop login attempts older than 10 minutes.
  for (const [k, v] of pending) if (Date.now() - v.ts > 600000) pending.delete(k);
  const p = new URLSearchParams({
    client_id: creds.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${p.toString()}`;
}

export async function handleKickCallback(creds, redirectUri, code, state) {
  const entry = pending.get(state);
  if (!entry) throw new Error("Invalid or expired login state");
  pending.delete(state);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: redirectUri,
    code_verifier: entry.verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Kick token exchange failed (${res.status})`);
  storeToken(await res.json());
}

function storeToken(j) {
  token = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || token?.refresh_token || null,
    expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    scope: j.scope || SCOPES,
  };
}

async function refreshToken(creds) {
  if (!token?.refresh_token) throw new Error("Kick session expired — reconnect.");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    token = null;
    throw new Error("Kick session expired — reconnect.");
  }
  storeToken(await res.json());
}

async function accessToken(creds) {
  if (!token) throw new Error("Kick not connected");
  if (Date.now() > token.expires_at - 30000) await refreshToken(creds);
  return token.access_token;
}

async function kickApi(creds, path, method, payload) {
  const at = await accessToken(creds);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    let msg = `Kick action failed (${res.status})`;
    if (res.status === 401) msg = "Kick session expired — reconnect.";
    else if (res.status === 403) msg = "Your connected Kick account isn't a mod here.";
    else {
      try {
        const e = await res.json();
        if (e?.message) msg = e.message;
      } catch {}
    }
    throw new Error(msg);
  }
  return res;
}

// duration: timeout length in MINUTES (1–10080); omit for a permanent ban.
export function kickBan(creds, { broadcasterUserId, targetUserId, duration, reason }) {
  return kickApi(creds, "/moderation/bans", "POST", {
    broadcaster_user_id: Number(broadcasterUserId),
    user_id: Number(targetUserId),
    ...(duration ? { duration: Number(duration) } : {}),
    ...(reason ? { reason } : {}),
  });
}

export function kickUnban(creds, { broadcasterUserId, targetUserId }) {
  return kickApi(creds, "/moderation/bans", "DELETE", {
    broadcaster_user_id: Number(broadcasterUserId),
    user_id: Number(targetUserId),
  });
}

export function kickSend(creds, { broadcasterUserId, content }) {
  return kickApi(creds, "/chat", "POST", {
    broadcaster_user_id: Number(broadcasterUserId),
    content: String(content).slice(0, 500),
    type: "user",
  });
}
