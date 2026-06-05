"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatFeed } from "../components/ChatFeed";
import { ChannelList } from "../components/ChannelList";
import { Connections } from "../components/Connections";
import { StyleControls } from "../components/StyleControls";
import { useHub } from "../lib/useHub";
import {
  SITE_DEFAULT_LOOK,
  buildQuery,
  DEFAULT_OPTIONS,
  type LookOptions,
  type OverlayOptions,
} from "../lib/overlay";
import { SourceLogo, SOURCE_LABELS, type SourceKey } from "../components/logos";
import { MBMark, MBWordmark } from "../components/brand";
import { StudioGate } from "../components/StudioGate";
import { ThemeToggle } from "../components/ThemeToggle";
import Link from "next/link";

const SOURCES: SourceKey[] = ["twitch", "kick", "x"];

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
    siteLook,
    pushSiteLook,
    hubUrl,
    hubHttpUrl,
  } = useHub();

  const [twitch, setTwitch] = useState<string[]>([]);
  const [kick, setKick] = useState<string[]>([]);
  const [xQuery, setXQuery] = useState("");
  const [xLiveHandle, setXLiveHandle] = useState("");
  const [xToken, setXToken] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [origin, setOrigin] = useState("");

  // Public chat appearance — edited here, broadcast to every visitor.
  const [look, setLook] = useState<LookOptions>(SITE_DEFAULT_LOOK);
  const [lookSeeded, setLookSeeded] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Seed the appearance controls from the hub's current site look (once).
  useEffect(() => {
    if (siteLook && !lookSeeded) {
      setLook({ ...SITE_DEFAULT_LOOK, ...siteLook } as LookOptions);
      setLookSeeded(true);
    }
  }, [siteLook, lookSeeded]);

  const patchLook = (p: Partial<LookOptions>) => {
    setLook((l) => {
      const next = { ...l, ...p };
      pushSiteLook(next);
      return next;
    });
  };

  // Seed the channel inputs from whatever the hub is currently following.
  useEffect(() => {
    if (serverChannels && !seeded) {
      setTwitch(serverChannels.twitch);
      setKick(serverChannels.kick);
      setXQuery(serverChannels.xQuery);
      setXLiveHandle(serverChannels.xLiveHandle ?? "");
      setSeeded(true);
    }
  }, [serverChannels, seeded]);

  const cleanTwitch = useMemo(() => twitch.map((s) => s.trim()).filter(Boolean), [twitch]);
  const cleanKick = useMemo(() => kick.map((s) => s.trim()).filter(Boolean), [kick]);

  const previewOptions: OverlayOptions = useMemo(
    () => ({ ...look, twitch: cleanTwitch, kick: cleanKick, xQuery }),
    [look, cleanTwitch, cleanKick, xQuery]
  );

  const readerUrl = useMemo(
    () =>
      `${origin}/reader?${buildQuery({
        ...DEFAULT_OPTIONS,
        twitch: cleanTwitch,
        kick: cleanKick,
        xQuery,
      })}`,
    [origin, cleanTwitch, cleanKick, xQuery]
  );

  const openReader = () =>
    window.open(readerUrl, "mbreader", "width=440,height=760,resizable=yes");

  const apply = () =>
    applyChannels({ twitch: cleanTwitch, kick: cleanKick, xQuery, xLiveHandle }, xToken);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") apply();
  };

  return (
    <div className="console">
      <header className="topbar">
        <div className="studio-brand">
          <MBMark size={24} />
          <MBWordmark className="studio-brand-word" />
          <span className="studio-tag">Studio</span>
        </div>
        <div className="topbar-right">
          <ThemeToggle className="term-icon" />
          <a className="btn btn-ghost btn-watch" href="/" target="_blank" rel="noreferrer">
            View site ↗
          </a>
          <div className="livestat">
            <span className={`dot ${hubConnected ? "on" : "off"}`} />
            <span>{hubConnected ? "live" : "offline"}</span>
          </div>
        </div>
      </header>

      {/* ---- Primary actions ---- */}
      <section className="hero">
        <div className="hero-copy">
          <span className="studio-eyebrow">Admin</span>
          <h1 className="hero-title">Run the room.</h1>
          <p className="hero-sub">
            Set the channels, connections, and overlay that power the public Market Bubble
            site.
          </p>
        </div>
        <div className="hero-actions">
          <a className="action action-primary" href="/watch" target="_blank" rel="noreferrer">
            <span className="action-title">Watch &amp; chat ↗</span>
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
                <div className="sc-target">
                  {disabled ? "no API token" : statuses[src].channel || "—"}
                </div>
              </div>
              <span className={`dot ${on ? "on" : "off"}`} />
            </div>
          );
        })}
      </div>

      <div className="grid">
        {/* ---- Channels ---- */}
        <section className="card">
          <h2 className="card-title">Channels</h2>
          <div className="fields">
            <ChannelList label="Twitch channels" values={twitch} onChange={setTwitch} onKeyDown={onKey} placeholder="e.g. FaZeBanks" />
            <ChannelList label="Kick channels" values={kick} onChange={setKick} onKeyDown={onKey} placeholder="e.g. ansem" />
            <Field
              label="X search query"
              value={xQuery}
              onChange={setXQuery}
              onKeyDown={onKey}
              placeholder="e.g. @handle or keyword"
            />
            <Field
              label="X live account (viewer count)"
              value={xLiveHandle}
              onChange={setXLiveHandle}
              onKeyDown={onKey}
              placeholder="e.g. banks"
              hint="The X account whose live broadcast viewer count shows on the dashboard. No API token needed."
            />
            <Field
              label="X bearer token (your own — enables X)"
              value={xToken}
              onChange={setXToken}
              onKeyDown={onKey}
              type="password"
              placeholder={xEnabled ? "X enabled — paste a token to replace" : "paste your X API bearer token"}
              hint={
                xEnabled
                  ? "X is connected. Token stays on the server, never in the overlay link."
                  : "Paste your own X bearer token to turn on X (kept server-side, not in the link)."
              }
            />
            <button className="btn btn-gold" onClick={apply}>
              Apply channels
            </button>
          </div>
        </section>

        {/* ---- Preview ---- */}
        <section className="card preview-card">
          <div className="preview-head">
            <h2 className="card-title">Live chat preview</h2>
            <span className="muted small">{messages.length} msgs</span>
          </div>
          <div className={`preview-stage bg-${look.bg}`}>
            <ChatFeed
              messages={messages}
              options={previewOptions}
              placeholder={
                <span>
                  Waiting for chat… set live channels and hit <b>Apply</b>.
                </span>
              }
            />
          </div>
          <p className="muted small">
            Server: <code>{hubUrl}</code> must be running to receive chat.
          </p>
        </section>
      </div>

      {/* ---- Public chat appearance (broadcast to all visitors) ---- */}
      <section className="card">
        <h2 className="card-title">Chat appearance</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Controls how the chat looks on the public Market Bubble site — applies live to
          everyone watching.
        </p>
        <StyleControls value={look} onChange={patchLook} />
      </section>

      <Connections
        xEnabled={xEnabled}
        kickEnabled={kickEnabled}
        kickConnected={kickConnected}
        hubHttpUrl={hubHttpUrl}
        onDisconnectKick={disconnectKickAccount}
      />
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
