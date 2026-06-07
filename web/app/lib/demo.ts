"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PROMO / DEMO MODE — fakes a live show for screen recording.
//
// When DEMO_MODE is true the home page acts as if Banks is LIVE: the live room
// is shown, fake chat streams in, the viewer index ticks with believable numbers,
// and the stream panel rolls a VOD as if it were the live feed.
//
// TO REVERT after recording: set DEMO_MODE = false (everything below goes inert
// and the site uses the real hub feed again).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ViewerSnapshot, Channels } from "./useHub";
import type { SourceKey } from "../components/logos";

export const DEMO_MODE = true;

// A Twitch VOD to roll in the "live" stream panel during the promo. Swap this id
// for any clip/VOD you want featured.
export const DEMO_VOD_ID = "2788673017";

// The show feed the demo pretends to follow.
export const DEMO_CHANNELS: Channels = {
  twitch: ["fazebanks"],
  kick: ["ansem"],
  xQuery: "from:Banks OR from:blknoiz06",
  xLiveHandle: "banks",
};

const NAMES = [
  "degenharry", "solanaMax", "cryptoKnight", "paperhands_pete", "wagmiqueen",
  "ngmi_andy", "moonboy420", "ansemarmy", "banksbillions", "chartwizard",
  "liquidated_again", "diamondhandz", "shortsqueezed", "gm_degen", "tendies_only",
  "rugpull_survivor", "leverageLarry", "pumpfun_pam", "hodlfather", "exitliquidity",
  "satoshis_cousin", "greencandlesonly", "rektremy", "vibes_trader", "100xorbust",
];

const MSGS = [
  "LETS GOOO 🚀", "banks cooking rn", "ansem was RIGHT about SOL",
  "buy the dip 📉➡️📈", "im all in chat", "this is not financial advice 😂",
  "down 40% but vibing", "BTC to 100k EOY", "diamond hands 💎🙌",
  "he literally called the top", "GM degens ☕", "wen lambo",
  "Polymarket odds are insane", "ratio'd by the market again", "+EV",
  "chat is this real", "ANSEM PNL INSANE", "banks down catastrophic 💀",
  "leverage = freedom", "sold the bottom as usual 🤡", "to the moon 🌙",
  "this clip is going viral", "first time catching it live!", "W stream",
  "the alpha is unreal", "screenshotting this", "calling it: SOL 500",
  "my portfolio is a meme", "fade me for guaranteed gains", "🔥🔥🔥",
  "banks the goat", "actual financial wizardry", "hold the line 🫡",
];

const COLORS = [
  "#ff7f50", "#1e90ff", "#2ecc7a", "#ff69b4", "#9acd32",
  "#daa520", "#8a2be2", "#ff5c5c", "#46d1ff", "#ffd166",
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

let counter = 0;
function makeMsg(): ChatMessage {
  counter += 1;
  // ~70% Twitch, 30% Kick for a believable mix
  const source: SourceKey = Math.random() < 0.7 ? "twitch" : "kick";
  const color = pick(COLORS);
  return {
    id: `demo-${counter}-${Math.floor(rand(0, 1e6))}`,
    source,
    username: pick(NAMES),
    text: pick(MSGS),
    timestamp: Date.now(),
    color,
    userColor: color,
    channel: source === "twitch" ? "fazebanks" : "ansem",
  };
}

function seed(n: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < n; i++) out.push(makeMsg());
  return out;
}

function makeViewers(tick: number): ViewerSnapshot {
  const tw = Math.round(8200 + tick * 13 + rand(-70, 70));
  const kk = Math.round(3100 + tick * 6 + rand(-35, 35));
  const xv = Math.round(1450 + tick * 4 + rand(-25, 25));
  const now = Date.now();
  return {
    channels: [
      { source: "twitch", channel: "fazebanks", live: true, viewers: tw },
      { source: "kick", channel: "ansem", live: true, viewers: kk },
    ],
    totals: { twitch: tw, kick: kk, total: tw + kk + xv },
    twitchEnabled: true,
    xLive: { handle: "banks", live: true, viewers: xv, views: xv * 7, updatedAt: now },
    updatedAt: now,
  };
}

export type DemoFeed = {
  messages: ChatMessage[];
  viewers: ViewerSnapshot;
  channels: Channels;
};

// Returns a live-looking fake feed when DEMO_MODE is on, else null.
export function useDemoFeed(): DemoFeed | null {
  const [messages, setMessages] = useState<ChatMessage[]>(() => (DEMO_MODE ? seed(18) : []));
  const [viewers, setViewers] = useState<ViewerSnapshot>(() => makeViewers(0));
  const tick = useRef(0);

  useEffect(() => {
    if (!DEMO_MODE) return;
    let chatTimer: ReturnType<typeof setTimeout>;
    const pushChat = () => {
      setMessages((m) => [...m, makeMsg()].slice(-200));
      chatTimer = setTimeout(pushChat, rand(450, 1500)); // natural, uneven cadence
    };
    chatTimer = setTimeout(pushChat, 700);

    const viewTimer = setInterval(() => {
      tick.current += 1;
      setViewers(makeViewers(tick.current));
    }, 3500);

    return () => {
      clearTimeout(chatTimer);
      clearInterval(viewTimer);
    };
  }, []);

  if (!DEMO_MODE) return null;
  return { messages, viewers, channels: DEMO_CHANNELS };
}
