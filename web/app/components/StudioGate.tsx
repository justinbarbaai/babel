"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MBMark } from "./brand";

// Lightweight owner-only gate for the Studio (admin). Not full auth — just a
// passphrase soft-lock so the page isn't open to anyone with the URL. We compare
// the SHA-256 of the entered passphrase to a stored hash (the plaintext never
// lives in the bundle), and remember success per-browser.
//
// Default passphrase is "marketbubble". Override by setting
// NEXT_PUBLIC_STUDIO_PASSHASH to the sha256 hex of your own passphrase.
const DEFAULT_HASH = "8d241580ea4f2f8bc53787f27c90f282280bb5d4068a02bb83d8f0bf9a9047c9";
const EXPECTED = process.env.NEXT_PUBLIC_STUDIO_PASSHASH || DEFAULT_HASH;
const LS_KEY = "mb.studio.key";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function StudioGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === EXPECTED) setAuthed(true);
    } catch {}
    setReady(true);
  }, []);

  const submit = async () => {
    const h = await sha256(value);
    if (h === EXPECTED) {
      try {
        localStorage.setItem(LS_KEY, EXPECTED);
      } catch {}
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setValue("");
    }
  };

  if (!ready) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="gate">
      <div className="gate-card">
        <MBMark size={34} />
        <h1 className="gate-title">Market Bubble Studio</h1>
        <p className="gate-sub">Enter the studio passphrase to continue.</p>
        <div className={`gate-row ${error ? "err" : ""}`}>
          <input
            type="password"
            value={value}
            autoFocus
            placeholder="Passphrase"
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            spellCheck={false}
          />
          <button onClick={submit}>Enter</button>
        </div>
        {error && <p className="gate-err">Incorrect passphrase.</p>}
      </div>
    </div>
  );
}
