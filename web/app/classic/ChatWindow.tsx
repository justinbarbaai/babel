"use client";

import { useEffect, useRef, useState } from "react";
import { SourceLogo } from "../components/logos";
import type { ChatMessage } from "../lib/useHub";

type Src = "twitch" | "kick" | "x";
const PLATFORM_TINT: Record<Src, string> = { twitch: "#a970ff", kick: "#53fc18", x: "#e7e9ea" };
const USER_COLORS = ["#e84d4d", "#3ea6ff", "#2fbf71", "#f0a020", "#c879f0", "#1fb6c1", "#e85d9e"];

const SAMPLE_USERS = ["degenpat", "ansem_fan", "bubblewatch", "polymkt_andy", "faze_jay", "tape_reader", "gm_gm", "sol_maxi", "banks_no1", "chartdaddy", "xrp_army", "vibes_only"];
const SAMPLE_MSGS = [
  "this is actually genius",
  "BANKS COOKED 🔥",
  "buy the dip?",
  "polymarket odds are wild rn",
  "ansem was right again",
  "chat is this real",
  "LETS GOOO",
  "the mac skin is insane lol",
  "gm degens",
  "SOL to the moon",
  "who's tapping in",
  "this UI goes hard",
  "markets green today 📈",
  "first time catching it live",
  "W stream",
];
const SAMPLE_SRC: Src[] = ["twitch", "twitch", "twitch", "kick", "kick", "x"];

let n = 0;
function sample(): ChatMessage {
  const source = SAMPLE_SRC[Math.floor((n * 7 + 3) % SAMPLE_SRC.length)];
  const username = SAMPLE_USERS[(n * 5 + 1) % SAMPLE_USERS.length];
  const text = SAMPLE_MSGS[(n * 3 + 2) % SAMPLE_MSGS.length];
  n += 1;
  return {
    id: `s${n}`,
    source,
    username,
    text,
    timestamp: 0,
    color: PLATFORM_TINT[source],
    userColor: source === "x" ? null : USER_COLORS[(n * 2) % USER_COLORS.length],
  };
}

export function ChatWindow({ live, onSay }: { live: ChatMessage[]; onSay?: () => void }) {
  const [local, setLocal] = useState<ChatMessage[]>(() => Array.from({ length: 8 }, sample));
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  // self-driving sample feed only while the real feed is quiet (off-air showcase)
  useEffect(() => {
    if (live.length > 0) return;
    const id = setInterval(() => {
      setLocal((m) => [...m.slice(-45), sample()]);
    }, 1700);
    return () => clearInterval(id);
  }, [live.length]);

  const msgs = live.length > 0 ? live.slice(-60) : local;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    setLocal((m) => [
      ...m.slice(-45),
      { id: `you${Date.now()}`, source: "twitch", username: "you", text: t, timestamp: 0, color: PLATFORM_TINT.twitch, userColor: "#ffd166" },
    ]);
    setDraft("");
    onSay?.();
  };

  return (
    <div className="chat-win">
      <div className="chat-scroll" ref={scroller}>
        {msgs.map((m) => (
          <div className="chat-row" key={m.id}>
            <span className="chat-badge" style={{ background: m.color }}>
              <SourceLogo source={m.source as Src} size={9} />
            </span>
            <span className="chat-user" style={{ color: m.userColor || m.color }}>
              {m.username}
            </span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send a message…"
          maxLength={120}
        />
        <button onClick={send} aria-label="Send">⮐</button>
      </div>
    </div>
  );
}
