"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChatFeed } from "../components/ChatFeed";
import { useHub } from "../lib/useHub";
import { SITE_DEFAULT_LOOK, type OverlayOptions } from "../lib/overlay";
import { SourceLogo, SOURCE_LABELS, type SourceKey } from "../components/logos";
import { MBLockup } from "../components/brand";
import { StudioGate } from "../components/StudioGate";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  getAuth,
  getClientId,
  setClientId,
  startLogin,
  handleRedirect,
  clearAuth,
  type TwitchAuth,
} from "../lib/twitchAuth";

const SOURCES: SourceKey[] = ["twitch", "kick", "x"];

const clean = (s: string) => s.replace(/^@/, "").trim();

export default function StudioPage() {
  return (
    <StudioGate>
      <ControlPanel />
    </StudioGate>
  );
}

function ControlPanel() {
  const {
    messages,
    statuses,
    hubConnected,
    xEnabled,
    kickEnabled,
    kickConnected,
    serverChannels,
    applyChannels,
    disconnectKickAccount,
    hubUrl,
    hubHttpUrl,
  } = useHub();

  // The show = Banks on Twitch + Ansem on Kick, both on X. Connecting / setting
  // any of these merges its chat into the single feed everyone sees.
  const [banksTwitch, setBanksTwitch] = useState("fazebanks");
  const [banksX, setBanksX] = useState("Banks");
  const [ansemKick, setAnsemKick] = useState("ansem");
  const [ansemX, setAnsemX] = useState("blknoiz06");

  const [twitch, setTwitch] = useState<string[]>([]);
  const [kick, setKick] = useState<string[]>([]);
  const [xQuery, setXQuery] = useState("");
  const [xLiveHandle, setXLiveHandle] = useState("");
  // Manual X live-viewer count + ingest key — X walls off every automated
  // path, so the operator pushes the number they see on x.com straight to the
  // hub (it broadcasts to every viewer's X bar).
  const [xLiveOn, setXLiveOn] = useState(false);
  const [xLiveCount, setXLiveCount] = useState("");
  const [xLiveKey, setXLiveKey] = useState("");
  const [xLiveStatus, setXLiveStatus] = useState("");
  useEffect(() => {
    try { setXLiveKey(localStorage.getItem("mb.ingestKey") || ""); } catch {}
  }, []);
  const pushXLive = async (live: boolean, count: number) => {
    const key = xLiveKey.trim();
    if (!key) { setXLiveStatus("Paste your ingest key first."); return; }
    try { localStorage.setItem("mb.ingestKey", key); } catch {}
    try {
      const res = await fetch(`${hubHttpUrl}/ingest/xlive`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ingest-key": key },
        body: JSON.stringify({ live, viewers: count }),
      });
      const j = await res.json();
      setXLiveStatus(j?.ok ? (live ? `Pushed — ${count.toLocaleString()} live` : "X set offline") : (j?.error || "failed"));
    } catch {
      setXLiveStatus("Can't reach the hub.");
    }
  };
  const [xToken, setXToken] = useState("");
  const [seeded, setSeeded] = useState(false);

  // Guest streamers — connect a Twitch or Kick channel (not X) and their chat
  // merges into the show feed too.
  type Guest = { id: number; platform: "twitch" | "kick"; channel: string };
  const [guests, setGuests] = useState<Guest[]>([]);
  const guestId = useRef(0);
  const addGuest = () =>
    setGuests((g) => [...g, { id: ++guestId.current, platform: "twitch", channel: "" }]);
  const updateGuest = (id: number, patch: Partial<Guest>) =>
    setGuests((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeGuest = (id: number) => setGuests((g) => g.filter((x) => x.id !== id));

  // ---- Twitch OAuth (client-side implicit; one connection for the show) ----
  const [twAuth, setTwAuth] = useState<TwitchAuth | null>(null);
  const [twClientId, setTwClientId] = useState("");
  const [twSetup, setTwSetup] = useState(false);
  const [twKey, setTwKey] = useState("");

  useEffect(() => {
    setTwClientId(getClientId());
    handleRedirect().then((a) => setTwAuth(a || getAuth()));
  }, []);

  const saveTwKey = () => {
    const id = twKey.trim();
    if (!id) return;
    setClientId(id);
    setTwClientId(id);
    setTwSetup(false);
  };

  // Seed inputs from whatever the hub currently follows.
  useEffect(() => {
    if (serverChannels && !seeded) {
      setTwitch(serverChannels.twitch);
      setKick(serverChannels.kick);
      setXQuery(serverChannels.xQuery);
      setXLiveHandle(serverChannels.xLiveHandle ?? "");
      if (serverChannels.twitch[0]) setBanksTwitch(serverChannels.twitch[0]);
      if (serverChannels.kick[0]) setAnsemKick(serverChannels.kick[0]);
      const froms = (serverChannels.xQuery.match(/from:(\w+)/gi) || []).map((m) => m.slice(5));
      if (froms[0]) setBanksX(froms[0]);
      if (froms[1]) setAnsemX(froms[1]);
      setSeeded(true);
    }
  }, [serverChannels, seeded]);

  const cleanTwitch = useMemo(() => twitch.map(clean).filter(Boolean), [twitch]);
  const cleanKick = useMemo(() => kick.map(clean).filter(Boolean), [kick]);

  const previewOptions: OverlayOptions = useMemo(
    () => ({ ...SITE_DEFAULT_LOOK, twitch: cleanTwitch, kick: cleanKick, xQuery }),
    [cleanTwitch, cleanKick, xQuery]
  );

  // Merge everything that's set/connected — hosts + guests — into one feed.
  const applyHosts = () => {
    const xHandles = [banksX, ansemX].map(clean).filter(Boolean);
    const xq = xHandles.map((h) => `from:${h}`).join(" OR ");
    const guestTw = guests.filter((g) => g.platform === "twitch").map((g) => clean(g.channel));
    const guestKk = guests.filter((g) => g.platform === "kick").map((g) => clean(g.channel));
    const tw = [...new Set([clean(banksTwitch), ...guestTw].filter(Boolean))];
    const kk = [...new Set([clean(ansemKick), ...guestKk].filter(Boolean))];
    setTwitch(tw);
    setKick(kk);
    setXQuery(xq);
    const live = xLiveHandle || clean(banksX);
    setXLiveHandle(live);
    applyChannels({ twitch: tw, kick: kk, xQuery: xq, xLiveHandle: live }, xToken);
  };

  const saveXAccess = () =>
    applyChannels({ twitch: cleanTwitch, kick: cleanKick, xQuery, xLiveHandle }, xToken);

  // ---- connect controls (rendered inside the platform blocks) ----
  const twitchConnect: ReactNode = twAuth ? (
    <div className="acct-conn on">
      <span className="acct-as">● @{twAuth.login}</span>
      <button className="acct-btn ghost" onClick={() => { clearAuth(); setTwAuth(null); }}>Disconnect</button>
    </div>
  ) : twClientId ? (
    <button className="acct-btn connect" data-platform="twitch" onClick={() => startLogin("/studio")}>
      Connect Twitch
    </button>
  ) : twSetup ? (
    <div className="acct-key">
      <input value={twKey} onChange={(e) => setTwKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveTwKey()} placeholder="Twitch Client ID" spellCheck={false} />
      <button className="acct-btn solid" onClick={saveTwKey}>Save</button>
    </div>
  ) : (
    <button className="acct-btn ghost" onClick={() => setTwSetup(true)}>Set up (add Client ID)</button>
  );

  const kickConnect: ReactNode = kickConnected ? (
    <div className="acct-conn on">
      <span className="acct-as">● Account linked</span>
      <button className="acct-btn ghost" onClick={disconnectKickAccount}>Disconnect</button>
    </div>
  ) : kickEnabled ? (
    <a className="acct-btn connect" data-platform="kick" href={`${hubHttpUrl}/auth/kick/login`}>Connect Kick</a>
  ) : (
    <p className="acct-note">
      Add <code>KICK_CLIENT_ID</code> / <code>KICK_CLIENT_SECRET</code> to the hub to enable.
    </p>
  );

  const xConnect: ReactNode = (
    <p className="acct-note">Posts arrive via the X API token — set it under <b>X access</b> below.</p>
  );

  return (
    <div className="console">
      <header className="topbar">
        <Link href="/" className="studio-brand" aria-label="Market Bubble">
          <MBLockup className="studio-lockup" />
          <span className="studio-tag">Studio</span>
        </Link>
        <div className="topbar-right">
          <ThemeToggle className="term-icon" />
          <a className="btn btn-ghost btn-watch" href="/">View site</a>
          <div className="livestat">
            <span className={`dot ${hubConnected ? "on" : "off"}`} />
            <span>{hubConnected ? "live" : "offline"}</span>
          </div>
        </div>
      </header>

      <section className="studio-head">
        <span className="studio-eyebrow">Operator console</span>
        <h1 className="studio-h1">Connect the show.</h1>
        <p className="studio-sub">
          Link Banks &amp; Ansem&apos;s accounts — every account you connect merges into the one chat
          everyone sees. The chat look is each viewer&apos;s own, set from the live room.
        </p>
      </section>

      {/* live source status */}
      <div className="statusrow">
        {SOURCES.map((src) => {
          const disabled = src === "x" && !xEnabled;
          const on = statuses[src].connected && !disabled;
          return (
            <div className={`statuscard ${on ? "live" : "down"}`} key={src} data-source={src}>
              <span className="sc-logo" style={{ color: src === "x" ? "var(--text)" : srcColor(src) }}>
                <SourceLogo source={src} size={18} />
              </span>
              <div className="sc-meta">
                <div className="sc-name">{SOURCE_LABELS[src]}</div>
                <div className="sc-target">{disabled ? "no API token" : statuses[src].channel || "—"}</div>
              </div>
              <span className={`dot ${on ? "on" : "off"}`} />
            </div>
          );
        })}
      </div>

      {/* host account cards — connect + channel, the one place the feed is built */}
      <div className="host-grid">
        <HostAccountCard name="Banks" role="Host" avatarHandle={banksX}>
          <PlatformBlock
            source="twitch"
            value={banksTwitch}
            onChange={setBanksTwitch}
            placeholder="fazebanks"
            on={!!twAuth}
            stateLabel={twAuth ? "Connected" : "Not connected"}
            connect={twitchConnect}
          />
          <PlatformBlock
            source="x"
            value={banksX}
            onChange={setBanksX}
            placeholder="Banks"
            on={xEnabled}
            stateLabel={xEnabled ? "API on" : "No token"}
            connect={xConnect}
          />
        </HostAccountCard>

        <HostAccountCard name="Ansem" role="Co-host" avatarHandle={ansemX}>
          <PlatformBlock
            source="kick"
            value={ansemKick}
            onChange={setAnsemKick}
            placeholder="ansem"
            on={kickConnected}
            stateLabel={kickConnected ? "Connected" : "Not connected"}
            connect={kickConnect}
          />
          <PlatformBlock
            source="x"
            value={ansemX}
            onChange={setAnsemX}
            placeholder="blknoiz06"
            on={xEnabled}
            stateLabel={xEnabled ? "API on" : "No token"}
            connect={xConnect}
          />
        </HostAccountCard>

        {guests.map((g) => (
          <GuestCard
            key={g.id}
            guest={g}
            onChange={(p) => updateGuest(g.id, p)}
            onRemove={() => removeGuest(g.id)}
          />
        ))}

        <button className="acct-add" onClick={addGuest}>
          <span className="acct-add-plus">+</span>
          <span className="acct-add-label">Add guest</span>
          <span className="acct-add-sub">Twitch or Kick — merges their chat in</span>
        </button>
      </div>

      <div className="host-apply">
        <button className="btn btn-gold" onClick={applyHosts}>Apply &amp; merge chat</button>
        <span className="muted small">
          Merges every connected account — Banks (Twitch) + Ansem (Kick) + both on X — into the one
          chat everyone sees.
        </span>
      </div>

      {/* X access (credential only) */}
      <section className="card">
        <h2 className="card-title">X access</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          The X API token that powers posts &amp; live views. The handles themselves live on the host
          cards above.
        </p>
        <div className="fields">
          <Field
            label="X bearer token (enables X)"
            value={xToken}
            onChange={setXToken}
            type="password"
            placeholder={xEnabled ? "X enabled — paste a token to replace" : "paste your X API bearer token"}
            hint={xEnabled ? "X is connected. Token stays server-side, never in any link." : "Paste your X bearer token to turn on X (kept server-side)."}
          />
          <Field
            label="X live account (viewer count)"
            value={xLiveHandle}
            onChange={setXLiveHandle}
            placeholder="e.g. banks"
            hint="The X account whose live broadcast viewer count shows on the site."
          />
          <button className="btn btn-gold" onClick={saveXAccess}>Save X access</button>
        </div>

        <h2 className="card-title" style={{ marginTop: 22 }}>X live viewers (manual)</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          X removed every public way to read a live broadcast&apos;s viewer count, so set it here:
          type the number you see on x.com and push it — it shows on everyone&apos;s X bar instantly.
        </p>
        <div className="fields">
          <Field
            label="Ingest key"
            value={xLiveKey}
            onChange={setXLiveKey}
            type="password"
            placeholder="paste the ingest key"
            hint="Separate from the operator key. Stored on this device."
          />
          <Field
            label="Live viewer count"
            value={xLiveCount}
            onChange={setXLiveCount}
            placeholder="e.g. 4368"
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-gold"
              onClick={() => { const n = parseInt(xLiveCount.replace(/[^\d]/g, ""), 10) || 0; setXLiveOn(true); pushXLive(true, n); }}
            >
              Push live count
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setXLiveOn(false); pushXLive(false, 0); }}
            >
              Set offline
            </button>
            {xLiveStatus && <span className="muted small">{xLiveStatus}</span>}
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            The pushed number stays live for 90s, so re-push every minute or so during the show.
          </p>
        </div>
      </section>

      {/* live chat preview */}
      <section className="card preview-card">
        <div className="preview-head">
          <h2 className="card-title">Live chat preview</h2>
          <span className="muted small">{messages.length} msgs</span>
        </div>
        <div className={`preview-stage bg-${SITE_DEFAULT_LOOK.bg}`}>
          <ChatFeed
            messages={messages}
            options={previewOptions}
            placeholder={<span>Waiting for chat… connect the hosts and hit <b>Apply &amp; merge chat</b>.</span>}
          />
        </div>
        <p className="muted small">Server: <code>{hubUrl}</code> must be running to receive chat.</p>
      </section>
    </div>
  );
}

function GuestCard({
  guest,
  onChange,
  onRemove,
}: {
  guest: { id: number; platform: "twitch" | "kick"; channel: string };
  onChange: (patch: Partial<{ platform: "twitch" | "kick"; channel: string }>) => void;
  onRemove: () => void;
}) {
  return (
    <section className="host-card acct-card guest-card">
      <div className="host-top">
        <div className="host-id">
          <span className="host-name">Guest</span>
          <span className="host-role">Stream + chat</span>
        </div>
        <button className="acct-remove" onClick={onRemove} aria-label="Remove guest">✕</button>
      </div>
      <div className="acct-blocks">
        <div className="acct-block" data-platform={guest.platform}>
          <div className="acct-head">
            <span className="acct-plat">Platform</span>
            <div className="acct-seg">
              <button className={guest.platform === "twitch" ? "on" : ""} onClick={() => onChange({ platform: "twitch" })}>
                <SourceLogo source="twitch" size={12} /> Twitch
              </button>
              <button className={guest.platform === "kick" ? "on" : ""} onClick={() => onChange({ platform: "kick" })}>
                <SourceLogo source="kick" size={12} /> Kick
              </button>
            </div>
          </div>
          <input
            className="acct-input"
            value={guest.channel}
            onChange={(e) => onChange({ channel: e.target.value })}
            placeholder={guest.platform === "twitch" ? "their_twitch" : "their_kick"}
            spellCheck={false}
          />
          <p className="acct-note">
            Their {guest.platform === "twitch" ? "Twitch" : "Kick"} chat merges into the show on Apply.
          </p>
        </div>
      </div>
    </section>
  );
}

function HostAccountCard({
  name,
  role,
  avatarHandle,
  children,
}: {
  name: string;
  role: string;
  avatarHandle: string;
  children: ReactNode;
}) {
  return (
    <section className="host-card acct-card">
      <div className="host-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="host-av" src={`https://unavatar.io/twitter/${clean(avatarHandle)}`} alt={name} />
        <div className="host-id">
          <span className="host-name">{name}</span>
          <span className="host-role">{role}</span>
        </div>
      </div>
      <div className="acct-blocks">{children}</div>
    </section>
  );
}

function PlatformBlock({
  source,
  value,
  onChange,
  placeholder,
  on,
  stateLabel,
  connect,
}: {
  source: SourceKey;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  on: boolean;
  stateLabel: string;
  connect: ReactNode;
}) {
  return (
    <div className="acct-block" data-platform={source}>
      <div className="acct-head">
        <span className="acct-logo" style={{ color: source === "x" ? "var(--text)" : srcColor(source) }}>
          <SourceLogo source={source} size={15} />
        </span>
        <span className="acct-plat">{SOURCE_LABELS[source]}</span>
        <span className={`acct-state ${on ? "on" : ""}`}>{stateLabel}</span>
      </div>
      <input
        className="acct-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
      <div className="acct-connect">{connect}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onKeyDown,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={type === "password" ? "off" : undefined}
        spellCheck={false}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

function srcColor(src: SourceKey): string {
  return src === "twitch" ? "#9146FF" : src === "kick" ? "#53FC18" : "#FFFFFF";
}
