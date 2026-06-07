"use client";

import { useEffect, useState } from "react";
import type { LookOptions } from "./overlay";

// Per-viewer chat appearance. Stored in THIS browser only and layered on top of
// the show's global look — so customizing never changes anyone else's view.

const KEY = "mb.chatPrefs";
const EVT = "mb:chatprefs";

export function getChatPrefs(): Partial<LookOptions> {
  if (typeof window === "undefined") return {};
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Partial<LookOptions>) : {};
  } catch {
    return {};
  }
}

export function setChatPrefs(patch: Partial<LookOptions>) {
  const next = { ...getChatPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function resetChatPrefs() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

// Reactive per-viewer prefs, shared across components via a window event.
export function useChatPrefs() {
  const [prefs, setPrefs] = useState<Partial<LookOptions>>({});
  useEffect(() => {
    setPrefs(getChatPrefs());
    const on = () => setPrefs(getChatPrefs());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return {
    prefs,
    patch: setChatPrefs,
    reset: resetChatPrefs,
    customized: Object.keys(prefs).length > 0,
  };
}
