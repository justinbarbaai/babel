"use client";

import { useEffect, useState } from "react";

// Per-viewer Kick sign-in. The OAuth round-trip happens on the hub (Kick's token
// exchange needs the client secret); the hub hands back an opaque session id that
// we store here and send with each Kick chat message so the viewer chats as
// themselves.

const HUB_HTTP = (process.env.NEXT_PUBLIC_HUB_URL || "ws://localhost:8080").replace(/^ws/, "http");
const KEY_ID = "mb.kickSession";
const KEY_USER = "mb.kickUser";
const EVT = "mb:kicksession";

export type KickSession = { id: string; username: string | null } | null;

export function getKickSession(): KickSession {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(KEY_ID);
  if (!id) return null;
  return { id, username: localStorage.getItem(KEY_USER) };
}

function setKickSession(id: string, username: string | null) {
  localStorage.setItem(KEY_ID, id);
  if (username) localStorage.setItem(KEY_USER, username);
  else localStorage.removeItem(KEY_USER);
  window.dispatchEvent(new Event(EVT));
}

export function clearKickSession() {
  const id = typeof window !== "undefined" ? localStorage.getItem(KEY_ID) : null;
  if (id) {
    // best-effort: tell the hub to drop the token
    fetch(`${HUB_HTTP}/auth/kick/session/disconnect?id=${encodeURIComponent(id)}`).catch(() => {});
  }
  localStorage.removeItem(KEY_ID);
  localStorage.removeItem(KEY_USER);
  window.dispatchEvent(new Event(EVT));
}

export function startKickLogin() {
  window.location.href = `${HUB_HTTP}/auth/kick/user/login`;
}

// Capture ?kick_session / ?kick_user from the OAuth redirect, then clean the URL.
function captureFromUrl() {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams(window.location.search);
  const id = p.get("kick_session");
  if (!id) return;
  setKickSession(id, p.get("kick_user"));
  p.delete("kick_session");
  p.delete("kick_user");
  const qs = p.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  window.history.replaceState(null, "", url);
}

// Reactive Kick session (shared across components via a window event).
export function useKickSession() {
  const [session, setSession] = useState<KickSession>(null);
  useEffect(() => {
    captureFromUrl();
    setSession(getKickSession());
    const onChange = () => setSession(getKickSession());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return { session, signOut: clearKickSession, signIn: startKickLogin };
}
