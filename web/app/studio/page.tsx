"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatFeed } from "../components/ChatFeed";
import { Connections } from "../components/Connections";
import { useHub } from "../lib/useHub";
import {
  SITE_DEFAULT_LOOK,
  buildQuery,
  DEFAULT_OPTIONS,
  type OverlayOptions,
} from "../lib/overlay";
import { SourceLogo, SOURCE_LABELS, type SourceKey } from "../components/logos";
import { MBLockup } from "../components/brand";
import { StudioGate } from "../components/StudioGate";
import { ThemeToggle } from "../components/ThemeToggle";

const SOURCES: SourceKey[] = ["twitch", "kick", "x"];
type Tab = "hosts" | "connections";
const TABS: [Tab, string][] = [
  ["hosts", "Hosts"],
  ["connections", "Connections"],
];

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

  const [tab, setTab] = useState<Tab>("hosts");

  // Per-host handles (the show = Banks on Twitch + Ansem on Kick, both on X).
  // This is the SINGLE source of truth for the show's channels.
  const [banksTwitch, setBanksTwitch] = useState("fazebanks");
  const [banksX, setBanksX] = useState("Banks");
  const [ansemKick, setAnsemKick] = useState("ansem");
  const [ansemX, setAnsemX] = useState("blknoiz06");

  // Derived channel config (built from the host cards on Apply).
  const [twitch, setTwitch] = useState<string[]>([]);
  const [kick, setKick] = useState<string[]>([]);
  const [xQuery, setXQuery] = useState("");
  const [xLiveHandle, setXLiveHandle] = useState("");
  const [xToken, setXToken] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  // Seed inputs from whatever the hub currently follows.
  useEffect(() => {
    if (serverChannels && !seeded) {
      setTwitch(serverChannels.twitch);
      setKick(serverChannels.kick);
      setXQuery(serverChannels.xQuery);
      setXLiveHandle(serverChannels.xLiveHandle ?? "");
      if (serverChannels.twitch[0]) setBanksTwitch(serverChannels.twitch[0]);
      if (serverChannels.kick[0]) setAnsemKick(serverChannels.kick[0]);
      // pull host X handles out of a "from:a OR from:b" query if present
      const froms = (serverChannels.xQuery.match(/from:(\w+)/gi) || []).map((m) => m.slice(5));
      if (froms[0]) setBanksX(froms[0]);
      if (froms[1]) setAnsemX(froms[1]);
      setSeeded(true);
    }
  }, [serverChannels, seeded]);

  const cleanTwitch = useMemo(() => twitch.map(clean).filter(Boolean), [twitch]);
  const cleanKick = useMemo(() => kick.map(clean).filter(Boolean), [kick]);

  // The Studio preview always shows the ship default look. Viewers personalize
  // their own chat from the live room — Studio no longer sets a global look.
  const previewOptions: OverlayOptions = useMemo(
    () => ({ ...SITE_DEFAULT_LOOK, twitch: cleanTwitch, kick: cleanKick, xQuery }),
    [cleanTwitch, cleanKick, xQuery]
  );

  const readerUrl = useMemo(
    () => `${origin}/reader?${buildQuery({ ...DEFAULT_OPTIONS, twitch: cleanTwitch, kick: cleanKick, xQuery })}`,
    [origin, cleanTwitch, cleanKick, xQuery]
  );
  const openReader = () => window.open(readerUrl, "mbreader", "width=440,height=760,resizable=yes");

  // Apply the show feed from the two host cards — the one place channels live.
  const applyHosts = () => {
    const xHandles = [banksX, ansemX].map(clean).filter(Boolean);
    const xq = xHandles.map((h) => `from:${h}`).join(" OR ");
    const tw = [clean(banksTwitch)].filter(Boolean);
    const kk = [clean(ansemKick)].filter(Boolean);
    setTwitch(tw);
    setKick(kk);
    setXQuery(xq);
    const live = xLiveHandle || clean(banksX);
    setXLiveHandle(live);
    applyChannels({ twitch: tw, kick: kk, xQuery: xq, xLiveHandle: live }, xToken);
  };

  // Save X credentials without disturbing the host channels.
  const saveXAccess = () =>
    applyChannels({ twitch: cleanTwitch, kick: cleanKick, xQuery, xLiveHandle }, xToken);

  return (
    <div className="console">
      <header className="topbar">
        <Link href="/" className="studio-brand" aria-label="Market Bubble">
          <MBLockup className="studio-lockup" />
          <span className="studio-tag">Studio</span>
        </Link>
        <div className="topbar-right">
          <ThemeToggle className="term-icon" />
          <a className="btn btn-ghost btn-watch" href="/watch">Watch</a>
          <a className="btn btn-ghost btn-watch" href="/">View site</a>
          <div className="livestat">
            <span className={`dot ${hubConnected ? "on" : "off"}`} />
            <span>{hubConnected ? "live" : "offline"}</span>
          </div>
        </div>
      </header>

      <section className="studio-head">
        <span className="studio-eyebrow">Operator console</span>
        <h1 className="studio-h1">Run the room.</h1>
        <p className="studio-sub">
          The show is Banks &amp; Ansem. Set their channels in <b>Hosts</b>, and link the accounts that
          power posting in <b>Connections</b>. The chat look is each viewer&apos;s own — set from the live room.
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

      {/* tabs */}
      <nav className="studio-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`studio-tab ${tab === key ? "on" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ---- HOSTS — the single source of truth for the show's channels ---- */}
      {tab === "hosts" && (
        <>
          <div className="host-grid">
            <HostCard
              name="Banks"
              role="Host"
              xHandle={banksX}
              statuses={statuses}
              fields={[
                { source: "twitch", label: "Twitch channel", value: banksTwitch, onChange: setBanksTwitch, placeholder: "fazebanks" },
                { source: "x", label: "X handle", value: banksX, onChange: setBanksX, placeholder: "Banks" },
              ]}
            />
            <HostCard
              name="Ansem"
              role="Co-host"
              xHandle={ansemX}
              statuses={statuses}
              fields={[
                { source: "kick", label: "Kick channel", value: ansemKick, onChange: setAnsemKick, placeholder: "ansem" },
                { source: "x", label: "X handle", value: ansemX, onChange: setAnsemX, placeholder: "blknoiz06" },
              ]}
            />
          </div>
          <div className="host-apply">
            <button className="btn btn-gold" onClick={applyHosts}>Apply show feed</button>
            <span className="muted small">
              Merges Banks (Twitch) + Ansem (Kick) + both on X into the one chat everyone sees.
            </span>
          </div>

          <section className="card preview-card">
            <div className="preview-head">
              <h2 className="card-title">Live chat preview</h2>
              <span className="muted small">{messages.length} msgs</span>
            </div>
            <div className={`preview-stage bg-${SITE_DEFAULT_LOOK.bg}`}>
              <ChatFeed
                messages={messages}
                options={previewOptions}
                placeholder={<span>Waiting for chat… set the hosts and hit <b>Apply show feed</b>.</span>}
              />
            </div>
            <p className="muted small">Server: <code>{hubUrl}</code> must be running to receive chat.</p>
          </section>

          <section className="card">
            <h2 className="card-title">Outputs</h2>
            <div className="hero-actions">
              <a className="action action-primary" href="/watch">
                <span className="action-title">Watch &amp; chat</span>
                <span className="action-desc">Stream player + unified chat in one view</span>
              </a>
              <button className="action" onClick={openReader} suppressHydrationWarning>
                <span className="action-title">Pop out reader ↗</span>
                <span className="action-desc">Floating, resizable chat window</span>
              </button>
              <a className="action action-ghost" href="/overlay-studio">
                <span className="action-title">Chat overlay for OBS</span>
                <span className="action-desc">Build a transparent browser source</span>
              </a>
            </div>
          </section>
        </>
      )}

      {/* ---- CONNECTIONS — account credentials / plumbing only (no channels) ---- */}
      {tab === "connections" && (
        <>
          <Connections
            xEnabled={xEnabled}
            kickEnabled={kickEnabled}
            kickConnected={kickConnected}
            hubHttpUrl={hubHttpUrl}
            onDisconnectKick={disconnectKickAccount}
          />

          <section className="card">
            <h2 className="card-title">X access</h2>
            <p className="muted small" style={{ marginTop: 0 }}>
              Credentials only — the X handles themselves are set on the <b>Hosts</b> tab.
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
          </section>
        </>
      )}
    </div>
  );
}

type HostField = {
  source: SourceKey;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

function HostCard({
  name,
  role,
  xHandle,
  fields,
  statuses,
}: {
  name: string;
  role: string;
  xHandle: string;
  fields: HostField[];
  statuses: Record<SourceKey, { connected: boolean; channel: string }>;
}) {
  return (
    <section className="host-card">
      <div className="host-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="host-av" src={`https://unavatar.io/twitter/${clean(xHandle)}`} alt={name} />
        <div className="host-id">
          <span className="host-name">{name}</span>
          <span className="host-role">{role}</span>
        </div>
        <div className="host-dots">
          {fields.map((f) => {
            const live = f.source !== "x" && statuses[f.source]?.connected;
            return (
              <span key={f.source} className={`host-dot ${live ? "on" : ""}`} title={SOURCE_LABELS[f.source]}>
                <SourceLogo source={f.source} size={13} />
              </span>
            );
          })}
        </div>
      </div>
      <div className="host-fields">
        {fields.map((f) => (
          <div className="field" key={f.source}>
            <label>
              <span className="host-field-logo" style={{ color: f.source === "x" ? "var(--text)" : srcColor(f.source) }}>
                <SourceLogo source={f.source} size={12} />
              </span>{" "}
              {f.label}
            </label>
            <input value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} spellCheck={false} />
          </div>
        ))}
      </div>
    </section>
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
