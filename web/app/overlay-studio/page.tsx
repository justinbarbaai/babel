"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatFeed } from "../components/ChatFeed";
import { StyleControls } from "../components/StyleControls";
import { useHub } from "../lib/useHub";
import {
  DEFAULT_OPTIONS,
  buildQuery,
  loadLook,
  saveLook,
  pickLook,
  type LookOptions,
  type OverlayOptions,
} from "../lib/overlay";

const LOOK_KEY = "babel.overlay.look";

const DEFAULT_LOOK: LookOptions = pickLook(DEFAULT_OPTIONS);

// Chat overlay studio: build the OBS browser-source link. Channels come from the
// hub (set on the home page); here you only shape how the overlay looks.
export default function OverlayStudio() {
  const { messages, serverChannels, hubConnected, pushStyle, hubUrl } = useHub();

  const [look, setLook] = useState<LookOptions>(DEFAULT_LOOK);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setLook(loadLook(LOOK_KEY, DEFAULT_LOOK));
    document.title = "Babel — Overlay Studio";
  }, []);

  // Persist + push to any live overlay so OBS updates without re-copying.
  useEffect(() => {
    saveLook(LOOK_KEY, look);
    if (hubConnected) pushStyle(look);
  }, [look, hubConnected, pushStyle]);

  const patch = (p: Partial<LookOptions>) => setLook((l) => ({ ...l, ...p }));

  const options: OverlayOptions = useMemo(
    () => ({
      ...look,
      twitch: serverChannels?.twitch ?? [],
      kick: serverChannels?.kick ?? [],
      xQuery: serverChannels?.xQuery ?? "",
    }),
    [look, serverChannels]
  );

  const overlayUrl = useMemo(
    () => `${origin}/overlay?${buildQuery(options)}`,
    [origin, options]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = overlayUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="console">
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" className="watch-back" aria-label="Back to home">
            ‹
          </Link>
          <div className="wordmark">babel</div>
          <span className="watch-sub">overlay studio</span>
        </div>
        <div className="topbar-right">
          <a className="btn btn-ghost" href="/watch" target="_blank" rel="noreferrer">
            Watch &amp; chat ↗
          </a>
          <div className="livestat">
            <span className={`dot ${hubConnected ? "on" : "off"}`} />
            <span>{hubConnected ? "live" : "offline"}</span>
          </div>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h2 className="card-title">Overlay style</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            Channels are set on the <Link href="/">home page</Link>; this overlay follows them
            automatically.
          </p>
          <StyleControls value={look} onChange={patch} />
        </section>

        <section className="card preview-card">
          <div className="preview-head">
            <h2 className="card-title">Live preview</h2>
            <span className="muted small">{messages.length} msgs</span>
          </div>
          <div className={`preview-stage bg-${look.bg}`}>
            <ChatFeed
              messages={messages}
              options={options}
              placeholder={
                <span>
                  Waiting for chat… set live channels on the <Link href="/">home page</Link>.
                </span>
              }
            />
          </div>
        </section>
      </div>

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
          <button className="btn btn-gold" onClick={copy}>
            {copied ? "Copied!" : "Copy link"}
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
