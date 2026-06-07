"use client";

import { useEffect, useState } from "react";
import { TwitchLogo, KickLogo, XLogo } from "./logos";
import {
  getAuth,
  getClientId,
  setClientId,
  startLogin,
  handleRedirect,
  clearAuth,
  type TwitchAuth,
} from "../lib/twitchAuth";

// "Connect your accounts" hub. Twitch is a real OAuth connection (chat send +
// moderation). X reflects whether a server-side bearer token is configured.
// Kick/YouTube are on the roadmap (they need their own OAuth apps + chat
// ingestion) and are shown honestly as planned rather than faked.
export function Connections({
  xEnabled,
  kickEnabled,
  kickConnected,
  hubHttpUrl,
  onDisconnectKick,
}: {
  xEnabled: boolean;
  kickEnabled: boolean;
  kickConnected: boolean;
  hubHttpUrl: string;
  onDisconnectKick: () => void;
}) {
  const [auth, setAuth] = useState<TwitchAuth | null>(null);
  const [clientId, setClientIdState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    setClientIdState(getClientId());
    handleRedirect().then((a) => setAuth(a || getAuth()));
  }, []);

  const saveKey = () => {
    const id = keyInput.trim();
    if (!id) return;
    setClientId(id);
    setClientIdState(id);
    setShowKey(false);
  };

  return (
    <section className="card connections">
      <h2 className="card-title">Connect your accounts</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Link a platform to send and moderate from one place. Reading chat works without
        connecting; connecting unlocks posting and mod tools as you.
      </p>

      <div className="conn-grid">
        {/* ---- Twitch (real OAuth) ---- */}
        <div className="conn-card" data-platform="twitch">
          <div className="conn-rim" />
          <div className="conn-head">
            <span className="conn-logo">
              <TwitchLogo size={20} />
            </span>
            <div className="conn-meta">
              <div className="conn-name">Twitch</div>
              <div className="conn-sub">Send messages · timeout · ban</div>
            </div>
            <span className={`conn-status ${auth ? "on" : ""}`}>
              {auth ? "Connected" : "Not connected"}
            </span>
          </div>

          {auth ? (
            <div className="conn-actions">
              <span className="conn-as">● @{auth.login}</span>
              <button
                className="btn btn-ghost conn-btn"
                onClick={() => {
                  clearAuth();
                  setAuth(null);
                }}
              >
                Disconnect
              </button>
            </div>
          ) : clientId ? (
            <button className="btn btn-gold conn-btn full" onClick={() => startLogin("/")}>
              Connect Twitch
            </button>
          ) : showKey ? (
            <div className="conn-key">
              <input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="Twitch Client ID"
                spellCheck={false}
              />
              <button className="btn btn-gold conn-btn" onClick={saveKey}>
                Save
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost conn-btn full" onClick={() => setShowKey(true)}>
              Set up (add Client ID)
            </button>
          )}
        </div>

        {/* ---- X (bearer-token based) ---- */}
        <div className="conn-card" data-platform="x">
          <div className="conn-rim" />
          <div className="conn-head">
            <span className="conn-logo">
              <XLogo size={18} />
            </span>
            <div className="conn-meta">
              <div className="conn-name">X</div>
              <div className="conn-sub">Posts, live views &amp; chat</div>
            </div>
            <span className={`conn-status ${xEnabled ? "on" : ""}`}>
              {xEnabled ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="conn-note">
            {xEnabled
              ? "An X API bearer token is configured on the server."
              : "Add your X API bearer token under “X access” below to enable X."}
          </p>
        </div>

        {/* ---- Kick (real OAuth) ---- */}
        <div className="conn-card" data-platform="kick">
          <div className="conn-rim" />
          <div className="conn-head">
            <span className="conn-logo">
              <KickLogo size={18} />
            </span>
            <div className="conn-meta">
              <div className="conn-name">Kick</div>
              <div className="conn-sub">Send messages · timeout · ban</div>
            </div>
            <span className={`conn-status ${kickConnected ? "on" : kickEnabled ? "" : "planned"}`}>
              {kickConnected ? "Connected" : kickEnabled ? "Not connected" : "Setup needed"}
            </span>
          </div>

          {kickConnected ? (
            <div className="conn-actions">
              <span className="conn-as">● Account linked</span>
              <button className="btn btn-ghost conn-btn" onClick={onDisconnectKick}>
                Disconnect
              </button>
            </div>
          ) : kickEnabled ? (
            <a className="btn btn-gold conn-btn full" href={`${hubHttpUrl}/auth/kick/login`}>
              Connect Kick
            </a>
          ) : (
            <p className="conn-note">
              Add a Kick developer app&apos;s <code>KICK_CLIENT_ID</code> /{" "}
              <code>KICK_CLIENT_SECRET</code> to the hub, with redirect{" "}
              <code>{hubHttpUrl}/auth/kick/callback</code>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
