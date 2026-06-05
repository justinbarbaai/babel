"use client";

// Client-side Twitch OAuth (implicit flow) so a user can log in with their own
// Twitch account and send chat messages from a reader tab. The Client ID is
// public (not a secret); it comes from NEXT_PUBLIC_TWITCH_CLIENT_ID or a value
// the user pastes into the reader (stored in localStorage). The token never
// touches our server — sending happens directly from the browser to Twitch IRC.

const LS_CLIENT_ID = "mb_twitch_client_id";
const LS_AUTH = "mb_twitch_auth";
const SCOPES = "chat:read chat:edit";

export type TwitchAuth = { token: string; login: string };

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

export function startLogin() {
  const clientId = getClientId();
  if (!clientId) return;
  const redirect = `${window.location.origin}/reader`;
  const url =
    `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
  window.location.href = url;
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
    const auth: TwitchAuth = { token, login: j.login };
    localStorage.setItem(LS_AUTH, JSON.stringify(auth));
    return auth;
  } catch {
    return null;
  }
}
