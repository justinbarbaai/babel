"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatFeed } from "./components/ChatFeed";
import { useHub } from "./lib/useHub";
import {
  DEFAULT_OPTIONS,
  buildQuery,
  type OverlayOptions,
  type BadgeStyle,
  type BgStyle,
  type FontSize,
  type NameColor,
  type AccountColor,
} from "./lib/overlay";
import {
  SourceLogo,
  SOURCE_LABELS,
  type SourceKey,
} from "./components/logos";

const SOURCES: SourceKey[] = ["twitch", "kick", "x"];

export default function ControlPanel() {
  const { messages, statuses, xEnabled, serverChannels, applyChannels, hubUrl } =
    useHub();

  const [twitch, setTwitch] = useState("");
  const [kick, setKick] = useState("");
  const [xQuery, setXQuery] = useState("");
  const [seeded, setSeeded] = useState(false);

  const [look, setLook] = useState<Omit<OverlayOptions, "twitch" | "kick" | "xQuery">>({
    badge: DEFAULT_OPTIONS.badge,
    bg: DEFAULT_OPTIONS.bg,
    shadow: DEFAULT_OPTIONS.shadow,
    size: DEFAULT_OPTIONS.size,
    max: DEFAULT_OPTIONS.max,
    nameColor: DEFAULT_OPTIONS.nameColor,
    accountColor: DEFAULT_OPTIONS.accountColor,
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

  const options: OverlayOptions = useMemo(
    () => ({ ...look, twitch, kick, xQuery }),
    [look, twitch, kick, xQuery]
  );

  const overlayUrl = useMemo(
    () => `${origin}/overlay?${buildQuery(options)}`,
    [origin, options]
  );

  const apply = () => applyChannels({ twitch, kick, xQuery });

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
            <Field label="Twitch channel" value={twitch} onChange={setTwitch} onKeyDown={onKey} placeholder="e.g. ansem" />
            <Field label="Kick channel" value={kick} onChange={setKick} onKeyDown={onKey} placeholder="e.g. xqc" />
            <Field
              label="X search query"
              value={xQuery}
              onChange={setXQuery}
              onKeyDown={onKey}
              placeholder="e.g. @MarketBubble"
              hint={xEnabled ? undefined : "Add X_BEARER_TOKEN on the server to enable"}
            />
            <button className="btn btn-gold" onClick={apply}>
              Apply channels
            </button>
          </div>

          <h2 className="card-title mt">Overlay style</h2>

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

          <Segmented<BgStyle>
            label="Background behind text"
            value={look.bg}
            onChange={(bg) => setLook((l) => ({ ...l, bg }))}
            options={[
              ["glass", "Glass"],
              ["solid", "Solid"],
              ["none", "None"],
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
            <span className="muted small">{messages.length} msgs · this is exactly the overlay</span>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
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
  return (
    <div className="segmented">
      <span className="segmented-label">{label}</span>
      <div className="segmented-track">
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
