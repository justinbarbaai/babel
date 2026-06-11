"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChatFeed } from "../components/ChatFeed";
import { StyleControls } from "../components/StyleControls";
import { MBLockup } from "../components/brand";
import { ThemeToggle } from "../components/ThemeToggle";
import { SourceLogo } from "../components/logos";
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

const LOOK_KEY = "mb.overlay.look";
const CHANNELS_KEY = "mb.overlay.channels";
const DEFAULT_LOOK: LookOptions = pickLook(DEFAULT_OPTIONS);
const splitList = (s: string) => s.split(",").map((x) => x.trim().replace(/^@/, "")).filter(Boolean);

// Debounce a value — the preview re-follows channels as you type, but only
// after the typing settles (each re-follow spins real chat sources on the hub).
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Overlay studio: anyone can build a transparent chat overlay for ANY Twitch /
// Kick channel (theirs or the show's). A read-only overlay just needs the
// channel name — no account connection required. The overlay is defined entirely
// by the copied link, so editing here never changes the show's overlay.
export default function OverlayStudio() {
  const [look, setLook] = useState<LookOptions>(DEFAULT_LOOK);
  const [twitch, setTwitch] = useState("");
  const [kick, setKick] = useState("");
  // X is bring-your-own-token: streaming X posts costs money per read, so the
  // overlay owner supplies their own API bearer token and the reads bill THEM.
  const [xQuery, setXQuery] = useState("");
  const [xToken, setXToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // The preview follows whatever channels are typed (debounced), on a private
  // feed — the show's site chat is never touched by any of this.
  const dTwitch = useDebounced(twitch, 700);
  const dKick = useDebounced(kick, 700);
  const dXQuery = useDebounced(xQuery, 700);
  const dXToken = useDebounced(xToken, 700);
  const previewChannels = useMemo(() => {
    const tw = splitList(dTwitch);
    const kk = splitList(dKick);
    const xq = dXToken.trim() ? dXQuery.trim() : "";
    if (!tw.length && !kk.length && !xq) return null;
    return { twitch: tw, kick: kk, xQuery: xq, ...(dXToken.trim() ? { xToken: dXToken.trim() } : {}) };
  }, [dTwitch, dKick, dXQuery, dXToken]);
  const { messages, serverChannels, hubConnected, hubUrl } = useHub({
    pushChannels: previewChannels,
    privateScope: !!previewChannels,
  });

  useEffect(() => {
    setOrigin(window.location.origin);
    setLook(loadLook(LOOK_KEY, DEFAULT_LOOK));
    // Restore the channels the user saved — their studio, their channels.
    try {
      const raw = localStorage.getItem(CHANNELS_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        setTwitch(c.twitch ?? "");
        setKick(c.kick ?? "");
        setXQuery(c.xQuery ?? "");
        setXToken(c.xToken ?? "");
        setSeeded(true); // saved channels win — never re-seed the show's
      }
    } catch {}
    document.title = "Market Bubble — Overlay Studio";
  }, []);

  // First visit only: prefill with the show's channels as a starting point.
  // Once the user has touched anything, their saved channels stick.
  useEffect(() => {
    if (serverChannels && !seeded) {
      setTwitch(serverChannels.twitch.join(", "));
      setKick(serverChannels.kick.join(", "));
      setSeeded(true);
    }
  }, [serverChannels, seeded]);

  // Persist every edit so the studio reopens exactly how it was left.
  useEffect(() => {
    if (!seeded) return;
    try {
      localStorage.setItem(CHANNELS_KEY, JSON.stringify({ twitch, kick, xQuery, xToken }));
    } catch {}
  }, [seeded, twitch, kick, xQuery, xToken]);

  useEffect(() => saveLook(LOOK_KEY, look), [look]);

  const patch = (p: Partial<LookOptions>) => setLook((l) => ({ ...l, ...p }));

  const options: OverlayOptions = useMemo(
    () => ({
      ...look,
      twitch: splitList(twitch),
      kick: splitList(kick),
      // X only rides with a token — a query alone can't stream anything.
      xQuery: xToken.trim() ? xQuery.trim() : "",
    }),
    [look, twitch, kick, xQuery, xToken]
  );
  const overlayUrl = useMemo(() => {
    const base = `${origin}/overlay?${buildQuery(options)}`;
    // The token rides in the #fragment: browsers never send fragments in HTTP
    // requests, so it can't land in server or proxy logs. The overlay page
    // hands it to the hub over WSS only.
    return options.xQuery && xToken.trim() ? `${base}#xt=${encodeURIComponent(xToken.trim())}` : base;
  }, [origin, options, xToken]);
  const hasChannel = options.twitch.length > 0 || options.kick.length > 0 || !!options.xQuery;

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
        <Link href="/" className="studio-brand" aria-label="Market Bubble">
          <MBLockup className="studio-lockup" />
          <span className="studio-tag">Overlay</span>
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
        <span className="studio-eyebrow">Overlay studio</span>
        <h1 className="studio-h1">Your chat, on your stream.</h1>
        <p className="studio-sub">
          Build a transparent chat overlay for any Twitch or Kick channel — your own or the show's.
          No account needed; a read-only overlay just needs the channel name.
        </p>
      </section>

      <div className="grid">
        <section className="card">
          <h2 className="card-title">Channels</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            The channel(s) whose chat the overlay shows. Comma-separate for more than one.
          </p>
          <div className="fields">
            <div className="field">
              <label>
                <span className="host-field-logo" style={{ color: "#9146FF" }}>
                  <SourceLogo source="twitch" size={12} />
                </span>{" "}
                Twitch channel
              </label>
              <input value={twitch} onChange={(e) => setTwitch(e.target.value)} placeholder="your_twitch" spellCheck={false} />
            </div>
            <div className="field">
              <label>
                <span className="host-field-logo" style={{ color: "#53FC18" }}>
                  <SourceLogo source="kick" size={12} />
                </span>{" "}
                Kick channel
              </label>
              <input value={kick} onChange={(e) => setKick(e.target.value)} placeholder="your_kick" spellCheck={false} />
            </div>
            <div className="field">
              <label>
                <span className="host-field-logo">
                  <SourceLogo source="x" size={12} />
                </span>{" "}
                X posts (optional)
              </label>
              <input
                value={xQuery}
                onChange={(e) => setXQuery(e.target.value)}
                placeholder="from:yourhandle OR $TICKER"
                spellCheck={false}
              />
            </div>
            {xQuery.trim() && (
              <div className="field">
                <label>Your X API bearer token</label>
                <input
                  type="password"
                  value={xToken}
                  onChange={(e) => setXToken(e.target.value)}
                  placeholder="AAAAAAAAAA… (developer.x.com)"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="muted small" style={{ margin: "6px 0 0" }}>
                  X streaming reads are pay-per-use, so the overlay runs on <b>your</b> token and
                  bills your X developer account — never the show's. It rides after the link's{" "}
                  <code>#</code>, which browsers never send to servers.
                </p>
              </div>
            )}
          </div>

          <h2 className="card-title" style={{ marginTop: 22 }}>Style</h2>
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
              placeholder={<span>Enter a channel above — its chat previews here.</span>}
            />
          </div>
        </section>
      </div>

      <section className="card share">
        <h2 className="card-title">Add to your stream (OBS / Streamlabs)</h2>
        <p className="muted">
          Copy this link and add it as a <b>Browser Source</b>. It's transparent, so it overlays
          cleanly on your scene. The link carries your channels + style — anyone with it sees the
          same overlay.
        </p>
        <div className="urlbox">
          <input className="urlinput" readOnly value={hasChannel ? overlayUrl : ""} placeholder="Enter a channel above to get your link" suppressHydrationWarning onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn-gold" onClick={copy} disabled={!hasChannel}>
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a className="btn btn-ghost" href={hasChannel ? overlayUrl : undefined} target="_blank" rel="noreferrer" suppressHydrationWarning>
            Open
          </a>
        </div>
        <ol className="steps">
          <li>OBS → Sources → <b>+</b> → <b>Browser</b>.</li>
          <li>Paste the link as the URL. Set width <b>420</b>, height <b>720</b> (tweak to taste).</li>
          <li>Turn <b>“Shutdown source when not visible”</b> off so chat keeps flowing.</li>
          <li>Streamlabs is identical: Add Source → Browser Source → paste the link.</li>
        </ol>
        <p className="muted small">
          The hub (<code>{hubUrl}</code>) must be running for the overlay to receive chat. For a
          deployed setup, point <code>NEXT_PUBLIC_HUB_URL</code> at your hosted hub.
        </p>
      </section>
    </div>
  );
}
