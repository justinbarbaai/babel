"use client";

// Client-side Twitch OAuth (implicit flow) so a user can log in with their own
// Twitch account and send chat messages from a reader tab. The Client ID is
// public (not a secret); it comes from NEXT_PUBLIC_TWITCH_CLIENT_ID or a value
// the user pastes into the reader (stored in localStorage). The token never
// touches our server — sending happens directly from the browser to Twitch IRC.

const LS_CLIENT_ID = "mb_twitch_client_id";
const LS_AUTH = "mb_twitch_auth";
const LS_RETURN = "mb_twitch_return";
// chat:* lets us send; moderator:manage:banned_users lets a logged-in mod time
// out / ban chatters in channels they moderate.
const SCOPES = "chat:read chat:edit moderator:manage:banned_users";

export type TwitchAuth = { token: string; login: string; userId: string };

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(LS_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID ||
    ""
  );
}

export function setClientId(id: string) {
  localStorage.setItem(LS_CLIENT_ID, id.trim());
}

export function getAuth(): TwitchAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LS_AUTH);
    return v ? (JSON.parse(v) as TwitchAuth) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(LS_AUTH);
}

// Always returns to the public home (one canonical redirect URI to register in
// the Twitch app), then bounces to `returnPath` — so viewers never land on the
// operator reader/studio pages.
export function startLogin(returnPath = "/") {
  const clientId = getClientId();
  if (!clientId) return;
  try {
    localStorage.setItem(LS_RETURN, returnPath || "/");
  } catch {}
  const redirect = `${window.location.origin}/`;
  const url =
    `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
  // Break out of a same-origin embed (the /classic theater) — Twitch's OAuth
  // page refuses to render inside iframes.
  const nav = (() => { try { return window.top ?? window; } catch { return window; } })();
  nav.location.href = url;
}

// On reader load: if Twitch redirected back with a token in the URL fragment,
// validate it (which also gives us the login name needed for IRC) and store it.
export async function handleRedirect(): Promise<TwitchAuth | null> {
  if (typeof window === "undefined") return null;
  if (!window.location.hash.includes("access_token=")) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!token) return null;
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const auth: TwitchAuth = { token, login: j.login, userId: j.user_id };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    // bounce back to the page the user signed in from (public pages only)
    try {
      const ret = localStorage.getItem(LS_RETURN);
      localStorage.removeItem(LS_RETURN);
      if (ret && ret !== window.location.pathname) {
        window.location.replace(ret);
      }
    } catch {}
    return auth;
  } catch {
    return null;
  }
}
