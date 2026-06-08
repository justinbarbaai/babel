"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MBMark } from "./brand";

// Operator gate for the Studio. The key is validated SERVER-SIDE by the hub
// (constant-time compare against OPERATOR_KEY in the hub's env) — unlike a
// client-only check, this is what actually authorizes the privileged WS actions
// (reconfigure channels, set the global look, send/moderate as the show). On
// success the key is stored locally and useHub sends it on the hub connection.
const HUB_HTTP = (process.env.NEXT_PUBLIC_HUB_URL || "ws://localhost:8080").replace(/^ws/, "http");
const LS_KEY = "mb.operatorKey";

export function StudioGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) setAuthed(true);
    } catch {}
    setReady(true);
  }, []);

  const submit = async () => {
    const key = value.trim();
    if (!key || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`${HUB_HTTP}/auth/operator?key=${encodeURIComponent(key)}`);
      const j = await res.json();
      if (j?.ok) {
        try {
          localStorage.setItem(LS_KEY, key);
        } catch {}
        // reload so the hub WebSocket reconnects with operator privileges
        window.location.reload();
        return;
      }
      setError("Incorrect operator key.");
      setValue("");
    } catch {
      setError("Can't reach the hub — is the server running?");
    } finally {
      setChecking(false);
    }
  };

  if (!ready) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="gate">
      <div className="gate-card">
        <MBMark size={34} />
        <h1 className="gate-title">Market Bubble Studio</h1>
        <p className="gate-sub">Enter the operator key to continue.</p>
        <div className={`gate-row ${error ? "err" : ""}`}>
          <input
            type="password"
            value={value}
            autoFocus
            placeholder="Operator key"
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            spellCheck={false}
          />
          <button onClick={submit} disabled={checking}>
            {checking ? "…" : "Enter"}
          </button>
        </div>
        {error && <p className="gate-err">{error}</p>}
      </div>
    </div>
  );
}
