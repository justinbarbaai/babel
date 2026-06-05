"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChatFeed, type Moderation } from "./components/ChatFeed";
import { ThemeToggle } from "./components/ThemeToggle";
import { MBMark, MBWordmark } from "./components/brand";
import { Ticker } from "./components/Ticker";
import { Panel, type Rect } from "./components/Panel";
import { useHub, type ChatMessage } from "./lib/useHub";
import { SITE_DEFAULT_LOOK, type OverlayOptions } from "./lib/overlay";
import { SourceLogo, SOURCE_LABELS, type SourceKey } from "./components/logos";
import {
  getAuth,
  getClientId,
  setClientId,
  startLogin,
  handleRedirect,
  clearAuth,
  type TwitchAuth,
} from "./lib/twitchAuth";
import { TwitchSender } from "./lib/twitchSender";
import { twitchBan } from "./lib/twitchMod";

type Stream = { source: Exclude<SourceKey, "x">; channel: string };

const LAYOUT_KEY = "mb.workspace.v2";
type PanelId = "chat" | "stream" | "index";
type Workspace = Record<PanelId, Rect>;

function fmt(n: number): string {
  return n.toLocaleString();
}
function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export default function Home() {
  const {
    messages,
    totalMessages,
    serverChannels,
    hubConnected,
    viewers,
    profiles,
    requestProfile,
    kickConnected,
    modResult,
    sendResult,
    moderateKick,
    sendKick,
    siteLook,
  } = useHub();

  const [parent, setParent] = useState("");
  const [selected, setSelected] = useState<Stream | null>(null);
  // Chat appearance is controlled from the Studio (admin) and broadcast to all
  // visitors via the hub; fall back to the shared default.
  const feedOptions = useMemo<OverlayOptions>(
    () => ({ ...SITE_DEFAULT_LOOK, ...(siteLook || {}), twitch: [], kick: [], xQuery: "" }),
    [siteLook]
  );

  // ---- arrangeable workspace (draggable / resizable panels) ----
  const workRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ w: 0, h: 0 });
  const [layout, setLayout] = useState<Workspace | null>(null);
  const zRef = useRef(3);

  // Snap guides + drop-ghost are positioned imperatively (no React re-render
  // during a gesture, so dragging stays buttery).
  const vGuideRef = useRef<HTMLSpanElement>(null);
  const hGuideRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const showGuides = (x: number | null, y: number | null) => {
    const v = vGuideRef.current;
    const h = hGuideRef.current;
    if (v) {
      v.style.display = x != null ? "block" : "none";
      if (x != null) v.style.left = `${x}px`;
    }
    if (h) {
      h.style.display = y != null ? "block" : "none";
      if (y != null) h.style.top = `${y}px`;
    }
  };
  const showGhost = (b: { x: number; y: number; w: number; h: number } | null) => {
    const g = ghostRef.current;
    if (!g) return;
    if (!b) {
      g.style.display = "none";
      return;
    }
    g.style.display = "block";
    g.style.left = `${b.x}px`;
    g.style.top = `${b.y}px`;
    g.style.width = `${b.w}px`;
    g.style.height = `${b.h}px`;
  };

  useEffect(() => {
    const measure = () => {
      const el = workRef.current;
      if (el) setBounds({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load a saved arrangement, or lay out sensible defaults once we know the size.
  useEffect(() => {
    if (layout || bounds.w === 0) return;
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Workspace;
        zRef.current = Math.max(3, ...Object.values(saved).map((r) => r.z));
        setLayout(saved);
        return;
      }
    } catch {}
    const { w: W, h: H } = bounds;
    const g = 14;
    const chatW = Math.min(560, Math.max(360, W * 0.4));
    const railX = chatW + g * 2;
    const railW = Math.max(280, W - chatW - g * 3);
    const streamH = Math.min(railW * (9 / 16) + 46, H * 0.62);
    setLayout({
      chat: { x: g, y: g, w: chatW, h: H - g * 2, z: 3 },
      stream: { x: railX, y: g, w: railW, h: streamH, z: 2 },
      index: { x: railX, y: g + streamH + g, w: railW, h: Math.max(220, H - streamH - g * 3), z: 1 },
    });
  }, [bounds, layout]);

  useEffect(() => {
    if (layout) {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      } catch {}
    }
  }, [layout]);

  const moveRect = (id: PanelId, r: Rect) => setLayout((l) => (l ? { ...l, [id]: r } : l));
  const focusPanel = (id: PanelId) =>
    setLayout((l) => {
      if (!l) return l;
      const z = ++zRef.current;
      return l[id].z === z ? l : { ...l, [id]: { ...l[id], z } };
    });
  const resetLayout = () => {
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch {}
    setLayout(null);
  };

  const [auth, setAuth] = useState<TwitchAuth | null>(null);
  const [clientId, setClientIdState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [draft, setDraft] = useState("");
  const senderRef = useRef<TwitchSender | null>(null);

  useEffect(() => {
    setParent(window.location.hostname);
    setClientIdState(getClientId());
    handleRedirect().then((a) => setAuth(a || getAuth()));
  }, []);

  useEffect(() => {
    if (!auth) return;
    const s = new TwitchSender(auth.token, auth.login);
    s.connect();
    senderRef.current = s;
    return () => {
      s.close();
      senderRef.current = null;
    };
  }, [auth]);

  const streams = useMemo<Stream[]>(() => {
    if (!serverChannels) return [];
    return [
      ...serverChannels.twitch.map((channel) => ({ source: "twitch" as const, channel })),
      ...serverChannels.kick.map((channel) => ({ source: "kick" as const, channel })),
    ];
  }, [serverChannels]);

  useEffect(() => {
    if (!selected && streams.length) setSelected(streams[0]);
  }, [streams, selected]);

  const playerSrc = useMemo(() => {
    if (!selected || !parent) return "";
    return selected.source === "twitch"
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(selected.channel)}&parent=${encodeURIComponent(parent)}`
      : `https://player.kick.com/${encodeURIComponent(selected.channel)}`;
  }, [selected, parent]);

  // ---- live audience "index" ----
  const total = viewers?.totals.total ?? 0;
  const tw = viewers?.totals.twitch ?? 0;
  const kk = viewers?.totals.kick ?? 0;
  const xv = viewers?.xLive?.live ? viewers.xLive.viewers : 0;
  const breakdown = Math.max(1, tw + kk + xv);

  // viewer history → sparkline + delta
  const [history, setHistory] = useState<number[]>([]);
  const lastUpdated = viewers?.updatedAt;
  useEffect(() => {
    if (!viewers) return;
    setHistory((h) => (h[h.length - 1] === total ? h : [...h, total].slice(-40)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated]);
  const delta = history.length > 1 ? total - history[history.length - 2] : 0;

  const { perMin, chatters } = useMemo(() => {
    const now = messages.length ? messages[messages.length - 1].timestamp : Date.now();
    const recent = messages.filter((m) => now - m.timestamp < 60000).length;
    const uniq = new Set(messages.map((m) => `${m.source}:${m.username.toLowerCase()}`));
    return { perMin: recent, chatters: uniq.size };
  }, [messages]);

  // ---- chat send ----
  const twitchChannels = serverChannels?.twitch ?? [];
  const kickChannels = serverChannels?.kick ?? [];
  const canTwitch = !!auth && twitchChannels.length > 0;
  const canKick = kickConnected && kickChannels.length > 0;
  const canChat = canTwitch || canKick;
  const [targets, setTargets] = useState<{ twitch: boolean; kick: boolean }>({ twitch: true, kick: true });
  const sendTwitch = targets.twitch && canTwitch;
  const sendKickTarget = targets.kick && canKick;

  const submit = () => {
    const text = draft.trim();
    if (!text || (!sendTwitch && !sendKickTarget)) return;
    if (sendTwitch) for (const ch of twitchChannels) senderRef.current?.send(ch, text);
    if (sendKickTarget) for (const ch of kickChannels) sendKick(ch, text);
    setDraft("");
  };

  const saveKey = () => {
    const id = keyInput.trim();
    if (!id) return;
    setClientId(id);
    setClientIdState(id);
    setShowKey(false);
  };

  // ---- moderation + toast ----
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  const moderate = async (m: ChatMessage, minutes?: number) => {
    if (!m.channel) return;
    const label = minutes ? `Timed out ${m.username} (${minutes}m)` : `Banned ${m.username}`;
    if (m.source === "twitch") {
      if (!auth?.userId || !clientId) return;
      try {
        await twitchBan({
          token: auth.token,
          clientId,
          moderatorId: auth.userId,
          broadcasterLogin: m.channel,
          targetLogin: m.username,
          targetUserId: m.userId ?? undefined,
          duration: minutes ? minutes * 60 : undefined,
        });
        showToast(`${label} in #${m.channel}`, true);
      } catch (e: any) {
        showToast(e?.message || "Action failed", false);
      }
    } else if (m.source === "kick") {
      if (!kickConnected || !m.userId) return;
      moderateKick(m.channel, minutes ? "timeout" : "ban", m.userId, minutes);
    }
  };
  useEffect(() => {
    if (modResult) showToast(modResult.ok ? "Action applied" : modResult.error || "Action failed", modResult.ok);
  }, [modResult]);
  useEffect(() => {
    if (sendResult && !sendResult.ok) showToast(sendResult.error || "Kick send failed", false);
  }, [sendResult]);
  const moderation: Moderation = {
    canModerate: (m) =>
      (m.source === "twitch" && !!auth?.userId) || (m.source === "kick" && kickConnected && !!m.userId),
    onTimeout: (m, minutes) => moderate(m, minutes),
    onBan: (m) => moderate(m),
  };

  return (
    <div className="term">
      {/* ---- terminal top bar ---- */}
      <header className="term-bar">
        <div className="term-bar-left">
          <Link href="/" className="term-logo" aria-label="Market Bubble">
            <MBMark size={24} />
            <MBWordmark className="term-wordmark" />
          </Link>
          <nav className="term-nav">
            <Link href="/" className="active">Home</Link>
            <Link href="/market">Market</Link>
            <Link href="/news">News</Link>
          </nav>
        </div>
        <div className="term-bar-right">
          <span className={`term-status ${hubConnected ? "on" : ""}`}>
            <span className="term-status-dot" /> {hubConnected ? "LIVE" : "OFFLINE"}
          </span>
          <ThemeToggle className="term-icon" />
          <button className="term-icon" onClick={resetLayout} aria-label="Reset layout" title="Reset layout">
            ⤢
          </button>
          <a className="term-auth term-studio" href="/studio" title="Market Bubble Studio (admin)">
            Studio
          </a>
          {auth ? (
            <button className="term-auth" onClick={() => { clearAuth(); setAuth(null); }}>
              @{auth.login} · logout
            </button>
          ) : clientId ? (
            <button className="term-auth" onClick={() => startLogin("/")}>Log in</button>
          ) : showKey ? (
            <span className="reader-key">
              <input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveKey()}
                placeholder="Twitch Client ID"
                spellCheck={false}
              />
              <button onClick={saveKey}>Save</button>
            </span>
          ) : (
            <button className="term-auth" onClick={() => setShowKey(true)}>Join chat</button>
          )}
        </div>
      </header>

      {/* ---- arrangeable workspace: drag / resize the panels ---- */}
      <div className="work" ref={workRef}>
        {layout && (
          <>
            {/* THE ROOM — chat */}
            <Panel
              title="The Room"
              rect={layout.chat}
              bounds={bounds}
              siblings={[layout.stream, layout.index]}
              min={{ w: 300, h: 240 }}
              onChange={(r) => moveRect("chat", r)}
              onFocus={() => focusPanel("chat")}
              onGuides={showGuides}
              onGhost={showGhost}
              headerRight={<span className="panel-meta">{fmtK(chatters)} talking · {fmtK(perMin)}/min</span>}
            >
              <div className="panel-chat">
                <div className="panel-chat-feed">
                  <ChatFeed
                    messages={messages}
                    options={feedOptions}
                    profiles={profiles}
                    onHoverUser={requestProfile}
                    moderation={moderation}
                    placeholder={<span>Waiting for the show to go live…</span>}
                  />
                </div>
                {canChat ? (
                  <div className="term-composer">
                    <div className="term-pushrow">
                      {canTwitch && (
                        <button
                          type="button"
                          className={`watch-pushpill ${targets.twitch ? "on" : ""}`}
                          data-source="twitch"
                          onClick={() => setTargets((t) => ({ ...t, twitch: !t.twitch }))}
                        >
                          <SourceLogo source="twitch" size={12} /> Twitch
                        </button>
                      )}
                      {canKick && (
                        <button
                          type="button"
                          className={`watch-pushpill ${targets.kick ? "on" : ""}`}
                          data-source="kick"
                          onClick={() => setTargets((t) => ({ ...t, kick: !t.kick }))}
                        >
                          <SourceLogo source="kick" size={12} /> Kick
                        </button>
                      )}
                    </div>
                    <div className="reader-composer">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder={!sendTwitch && !sendKickTarget ? "Pick a platform…" : "Say something to the room…"}
                      />
                      <button onClick={submit} disabled={!sendTwitch && !sendKickTarget}>Send</button>
                    </div>
                  </div>
                ) : (
                  <div className="term-composer-hint">
                    Log in with Twitch or connect Kick in the <Link href="/studio">studio</Link> to talk.
                  </div>
                )}
              </div>
            </Panel>

            {/* STREAM */}
            <Panel
              title="Stream"
              pad={false}
              rect={layout.stream}
              bounds={bounds}
              siblings={[layout.chat, layout.index]}
              min={{ w: 280, h: 200 }}
              onChange={(r) => moveRect("stream", r)}
              onFocus={() => focusPanel("stream")}
              onGuides={showGuides}
              onGhost={showGhost}
              headerRight={
                streams.length > 1 ? (
                  <div className="panel-switch">
                    {streams.map((s) => {
                      const on = selected?.source === s.source && selected?.channel === s.channel;
                      return (
                        <button
                          key={`${s.source}:${s.channel}`}
                          className={`term-switch-pill ${on ? "on" : ""}`}
                          data-source={s.source}
                          onClick={() => setSelected(s)}
                        >
                          <SourceLogo source={s.source} size={11} /> {s.channel}
                        </button>
                      );
                    })}
                  </div>
                ) : null
              }
            >
              {playerSrc ? (
                <iframe
                  key={playerSrc}
                  src={playerSrc}
                  title={selected ? `${SOURCE_LABELS[selected.source]} — ${selected.channel}` : "stream"}
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  frameBorder="0"
                />
              ) : (
                <div className="term-pip-empty">
                  <span className="muted small">stream offline</span>
                </div>
              )}
            </Panel>

            {/* LIVE AUDIENCE — the index */}
            <Panel
              title="Live Audience"
              rect={layout.index}
              bounds={bounds}
              siblings={[layout.chat, layout.stream]}
              min={{ w: 280, h: 220 }}
              onChange={(r) => moveRect("index", r)}
              onFocus={() => focusPanel("index")}
              onGuides={showGuides}
              onGhost={showGhost}
              headerRight={<span className="panel-meta">Twitch · Kick · X</span>}
            >
              <div className="term-index-quote">
                <span className="term-index-num">{viewers ? fmt(total) : "—"}</span>
                <span className={`term-index-delta ${delta >= 0 ? "up" : "down"}`}>
                  {delta >= 0 ? "▲" : "▼"} {fmtK(Math.abs(delta))}
                </span>
              </div>
              <Sparkline data={history} up={delta >= 0} />
              <div className="term-rows">
                <IndexRow label="TWITCH" cls="tw" value={tw} pct={(tw / breakdown) * 100} />
                <IndexRow label="KICK" cls="kk" value={kk} pct={(kk / breakdown) * 100} />
                <IndexRow label="X" cls="x" value={xv} pct={(xv / breakdown) * 100} />
              </div>
              <div className="term-vol">
                <div className="term-vol-cell">
                  <span className="term-vol-num">{fmtK(perMin)}</span>
                  <span className="term-vol-label">msgs / min</span>
                </div>
                <div className="term-vol-cell">
                  <span className="term-vol-num">{fmtK(chatters)}</span>
                  <span className="term-vol-label">chatters</span>
                </div>
                <div className="term-vol-cell">
                  <span className="term-vol-num">{fmtK(totalMessages)}</span>
                  <span className="term-vol-label">messages</span>
                </div>
              </div>
            </Panel>
          </>
        )}
        <div ref={ghostRef} className="snap-ghost" style={{ display: "none" }} />
        <span ref={vGuideRef} className="snap-guide v" style={{ display: "none" }} />
        <span ref={hGuideRef} className="snap-guide h" style={{ display: "none" }} />
      </div>

      {/* ---- bottom tape: live market ticker + brand ---- */}
      <footer className="term-tape">
        <span className="term-tape-cap left">Invest in yourself</span>
        <div className="term-tape-ticker"><Ticker /></div>
        <span className="term-tape-cap right">LIVE THURS 1PM · <b>Polymarket</b></span>
      </footer>

      {toast && <div className={`watch-toast ${toast.ok ? "ok" : "err"}`} role="status">{toast.text}</div>}
    </div>
  );
}

function IndexRow({ label, cls, value, pct }: { label: string; cls: string; value: number; pct: number }) {
  return (
    <div className="term-row">
      <span className={`term-row-name ${cls}`}>{label}</span>
      <div className="term-row-track">
        <span className={`term-row-fill ${cls}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="term-row-val">{fmtK(value)}</span>
      <span className="term-row-pct">{Math.round(pct)}%</span>
    </div>
  );
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return <div className="term-spark empty" />;
  const w = 100;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className={`term-spark ${up ? "up" : "down"}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
