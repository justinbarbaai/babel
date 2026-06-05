"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatFeed } from "./components/ChatFeed";
import { ChannelList } from "./components/ChannelList";
import { useHub } from "./lib/useHub";
import {
  DEFAULT_OPTIONS,
  buildQuery,
  FONT_OPTIONS,
  type OverlayOptions,
  type BadgeStyle,
  type FontSize,
  type NameColor,
  type AccountColor,
  type FontChoice,
} from "./lib/overlay";
import {
  SourceLogo,
  SOURCE_LABELS,
  type SourceKey,
} from "./components/logos";

const SOURCES: SourceKey[] = ["twitch", "kick", "x"];

export default function ControlPanel() {
  const { messages, statuses, hubConnected, xEnabled, serverChannels, pushStyle, applyChannels, hubUrl } =
    useHub();

  const [twitch, setTwitch] = useState<string[]>([]);
  const [kick, setKick] = useState<string[]>([]);
  const [xQuery, setXQuery] = useState("");
  const [xToken, setXToken] = useState("");
  const [seeded, setSeeded] = useState(false);

  const [look, setLook] = useState<Omit<OverlayOptions, "twitch" | "kick" | "xQuery">>({
    badge: DEFAULT_OPTIONS.badge,
    bg: DEFAULT_OPTIONS.bg,
    shadow: DEFAULT_OPTIONS.shadow,
    size: DEFAULT_OPTIONS.size,
    max: DEFAULT_OPTIONS.max,
    nameColor: DEFAULT_OPTIONS.nameColor,
    accountColor: DEFAULT_OPTIONS.accountColor,
    font: DEFAULT_OPTIONS.font,
  });

  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  // Resolve origin after mount so SSR and first client render match (no
  // hydration mismatch on the overlay link).
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Seed the channel inputs from whatever the hub is currently following.
  useEffect(() => {
    if (serverChannels && !seeded) {
      setTwitch(serverChannels.twitch);
      setKick(serverChannels.kick);
      setXQuery(serverChannels.xQuery);
      setSeeded(true);
    }
  }, [serverChannels, seeded]);

  // Push the live style to the hub so an overlay already running in OBS updates
  // instantly when you change settings — no need to re-copy the link.
  useEffect(() => {
    if (hubConnected) pushStyle(look);
  }, [look, hubConnected, pushStyle]);

  const cleanTwitch = useMemo(
    () => twitch.map((s) => s.trim()).filter(Boolean),
    [twitch]
  );
  const cleanKick = useMemo(
    () => kick.map((s) => s.trim()).filter(Boolean),
    [kick]
  );

  const options: OverlayOptions = useMemo(
    () => ({ ...look, twitch: cleanTwitch, kick: cleanKick, xQuery }),
    [look, cleanTwitch, cleanKick, xQuery]
  );

  const overlayUrl = useMemo(
    () => `${origin}/overlay?${buildQuery(options)}`,
    [origin, options]
  );

  const readerUrl = useMemo(
    () => `${origin}/reader?${buildQuery(options)}`,
    [origin, options]
  );

  const openReader = () =>
    window.open(readerUrl, "mbreader", "width=440,height=760,resizable=yes");

  const apply = () =>
    applyChannels({ twitch: cleanTwitch, kick: cleanKick, xQuery }, xToken);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") apply();
  };

  const copy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(tag);
    setTimeout(() => setCopied((c) => (c === tag ? null : c)), 1600);
  };

  return (
    <div className="panel">
      <header className="topbar">
        <div className="wordmark">babel</div>
        <div className="livestat">
          <span className={`dot ${hubConnected ? "on" : "off"}`} />
          <span>{hubConnected ? "live" : "offline"}</span>
        </div>
      </header>

      <div className="statusrow">
        {SOURCES.map((src) => {
          const disabled = src === "x" && !xEnabled;
          const on = statuses[src].connected && !disabled;
          return (
            <div className={`statuscard ${on ? "live" : "down"}`} key={src} data-source={src}>
              <span className="sc-logo" style={{ color: src === "x" ? "#fff" : srcColor(src) }}>
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
        {/* ---- Controls ---- */}
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

          <h2 className="card-title mt">Overlay style</h2>

          <div className="selectfield">
            <span className="segmented-label">Chat font</span>
            <div className="select-wrap">
              <select
                className="select"
                value={look.font}
                onChange={(e) =>
                  setLook((l) => ({ ...l, font: e.target.value as FontChoice }))
                }
              >
                {FONT_OPTIONS.map(([val, text]) => (
                  <option key={val} value={val}>
                    {text}
                  </option>
                ))}
              </select>
              <span className="select-caret" aria-hidden>
                ▾
              </span>
            </div>
          </div>

          <Segmented<BadgeStyle>
            label="Badge"
            value={look.badge}
            onChange={(badge) => setLook((l) => ({ ...l, badge }))}
            options={[
              ["full", "Logo + name"],
              ["channel", "Logo + channel"],
              ["logo", "Logo only"],
              ["text", "Name only"],
              ["dot", "Color dot"],
            ]}
          />

          <Segmented<NameColor>
            label="Name color"
            value={look.nameColor}
            onChange={(nameColor) => setLook((l) => ({ ...l, nameColor }))}
            options={[
              ["chatter", "Their color"],
              ["platform", "Platform"],
              ["white", "White"],
            ]}
          />

          <Segmented<AccountColor>
            label="Account name color (Logo + channel badge)"
            value={look.accountColor}
            onChange={(accountColor) => setLook((l) => ({ ...l, accountColor }))}
            options={[
              ["white", "White"],
              ["platform", "Platform"],
            ]}
          />

          <Segmented<FontSize>
            label="Text size"
            value={look.size}
            onChange={(size) => setLook((l) => ({ ...l, size }))}
            options={[
              ["sm", "Small"],
              ["md", "Medium"],
              ["lg", "Large"],
            ]}
          />

          <label className="toggle">
            <input
              type="checkbox"
              checked={look.shadow}
              onChange={(e) => setLook((l) => ({ ...l, shadow: e.target.checked }))}
            />
            <span>Text shadow (readability over gameplay)</span>
          </label>
        </section>

        {/* ---- Preview ---- */}
        <section className="card preview-card">
          <div className="preview-head">
            <h2 className="card-title">Live preview</h2>
            <div className="preview-head-right">
              <span className="muted small">{messages.length} msgs</span>
              <button className="btn btn-pop" onClick={openReader} suppressHydrationWarning>
                Pop out reader ↗
              </button>
            </div>
          </div>
          <div className={`preview-stage bg-${look.bg}`}>
            <ChatFeed
              messages={messages}
              options={options}
              placeholder={
                <span>
                  Waiting for chat… set live channels above and hit <b>Apply</b>.
                </span>
              }
            />
          </div>
        </section>
      </div>

      {/* ---- Share / OBS ---- */}
      <section className="card share">
        <h2 className="card-title">Add to your stream (OBS / Streamlabs)</h2>
        <p className="muted">
          Copy this link and add it as a <b>Browser Source</b>. It has a transparent
          background, so it overlays cleanly on your scene. The link includes your
          channels and style — anyone with it sees the same overlay.
        </p>
        <div className="urlbox">
          <input
            className="urlinput"
            readOnly
            value={overlayUrl}
            suppressHydrationWarning
            onFocus={(e) => e.currentTarget.select()}
          />
          <button className="btn btn-gold" onClick={() => copy(overlayUrl, "url")}>
            {copied === "url" ? "Copied!" : "Copy link"}
          </button>
          <a className="btn btn-ghost" href={overlayUrl} target="_blank" rel="noreferrer" suppressHydrationWarning>
            Open
          </a>
        </div>
        <ol className="steps">
          <li>OBS → Sources → <b>+</b> → <b>Browser</b>.</li>
          <li>Paste the link as the URL. Set width <b>420</b>, height <b>720</b> (tweak to taste).</li>
          <li>Tick <b>“Shutdown source when not visible”</b> off so chat keeps flowing.</li>
          <li>Streamlabs is identical: Add Source → Browser Source → paste the link.</li>
        </ol>
        <p className="muted small">
          Tip: the server (<code>{hubUrl}</code>) must be running for the overlay to receive
          chat. For a deployed setup, point <code>NEXT_PUBLIC_HUB_URL</code> at your hosted hub.
        </p>
      </section>
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

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex(([val]) => val === value)
  );
  return (
    <div className="segmented">
      <span className="segmented-label">{label}</span>
      <div
        className="segmented-track"
        style={{ ["--seg-count" as any]: options.length }}
      >
        <span
          className="seg-thumb"
          style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
        />
        {options.map(([val, text]) => (
          <button
            key={val}
            className={`seg ${value === val ? "active" : ""}`}
            onClick={() => onChange(val)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function srcColor(src: SourceKey): string {
  return src === "twitch" ? "#9146FF" : src === "kick" ? "#53FC18" : "#FFFFFF";
}
