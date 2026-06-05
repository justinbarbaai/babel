// Shared description of an overlay's look + which channels it follows.
// Everything here is encoded into the /overlay?... link so an OBS browser
// source is fully self-contained.

export type BadgeStyle = "full" | "channel" | "logo" | "text" | "dot" | "none";
export type BgStyle = "glass" | "box" | "none";
export type FontSize = "sm" | "md" | "lg";
export type NameColor = "chatter" | "platform" | "white";
export type AccountColor = "platform" | "white";
export type FontChoice =
  | "inter"
  | "montserrat"
  | "poppins"
  | "oswald"
  | "anton"
  | "impact"
  | "futura";

// CSS font-family stacks for each chat-font choice. Inter/Montserrat/Poppins/
// Oswald/Anton load as web fonts (CSS vars); Impact/Futura are system fonts.
export const FONT_STACKS: Record<FontChoice, string> = {
  inter: "var(--font-inter), system-ui, sans-serif",
  montserrat: "var(--font-montserrat), system-ui, sans-serif",
  poppins: "var(--font-poppins), system-ui, sans-serif",
  oswald: "var(--font-oswald), system-ui, sans-serif",
  anton: "var(--font-anton), Impact, system-ui, sans-serif",
  impact: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  futura: "Futura, 'Trebuchet MS', system-ui, sans-serif",
};

export const FONT_OPTIONS: [FontChoice, string][] = [
  ["inter", "Inter (Twitch)"],
  ["montserrat", "Montserrat"],
  ["poppins", "Poppins"],
  ["oswald", "Oswald"],
  ["anton", "Anton (heavy)"],
  ["impact", "Impact"],
  ["futura", "Futura"],
];

export interface OverlayOptions {
  badge: BadgeStyle;
  bg: BgStyle;
  shadow: boolean;
  size: FontSize;
  max: number;
  nameColor: NameColor;
  // Color of the connected account name shown in the "Logo + channel" badge.
  accountColor: AccountColor;
  // Chat-overlay font.
  font: FontChoice;
  // Show a HH:MM timestamp before each message (like Twitch).
  timestamps: boolean;
  // Channels this overlay should make the hub follow (Twitch/Kick can be many).
  twitch: string[];
  kick: string[];
  xQuery: string;
}

// Just the visual style of a chat feed — no channels. Shared by the overlay
// studio and the watch dashboard's settings drawer.
export type LookOptions = Omit<OverlayOptions, "twitch" | "kick" | "xQuery">;

export const DEFAULT_OPTIONS: OverlayOptions = {
  badge: "full",
  bg: "none",
  shadow: true,
  size: "md",
  max: 40,
  nameColor: "chatter",
  accountColor: "white",
  font: "montserrat",
  timestamps: false,
  twitch: [],
  kick: [],
  xQuery: "",
};

// The watch dashboard's chat defaults to a denser, boxed look (channel badges,
// platform-colored account names) suited to a read-along feed rather than an
// over-gameplay overlay.
export const WATCH_DEFAULT_LOOK: LookOptions = {
  badge: "channel",
  bg: "box",
  shadow: false,
  size: "md",
  max: 80,
  nameColor: "chatter",
  accountColor: "platform",
  font: DEFAULT_OPTIONS.font,
  timestamps: false,
};

// Strip channels off a full OverlayOptions to get just the visual look.
export function pickLook(o: OverlayOptions): LookOptions {
  const { twitch, kick, xQuery, ...look } = o;
  return look;
}

// Default look for the public Market Bubble room chat. The admin (Studio) can
// override this and broadcast it to every visitor via the hub.
export const SITE_DEFAULT_LOOK: LookOptions = {
  badge: "channel",
  bg: "none",
  shadow: false,
  size: "md",
  max: 120,
  nameColor: "chatter",
  accountColor: "platform",
  font: "montserrat",
  timestamps: true,
};

// Persisted look helpers — each surface (overlay studio, watch drawer) keeps its
// own look under a distinct key so they can be styled independently.
export function loadLook(key: string, fallback: LookOptions): LookOptions {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {}
  return fallback;
}

export function saveLook(key: string, look: LookOptions): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(look));
  } catch {}
}

function splitList(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return value && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

export function parseOptions(params: URLSearchParams): OverlayOptions {
  return {
    badge: pick(params.get("badge"), ["full", "channel", "logo", "text", "dot", "none"], DEFAULT_OPTIONS.badge),
    bg: pick(params.get("bg"), ["glass", "box", "none"], DEFAULT_OPTIONS.bg),
    shadow: params.get("shadow") !== "0",
    size: pick(params.get("size"), ["sm", "md", "lg"], DEFAULT_OPTIONS.size),
    max: clampInt(params.get("max"), DEFAULT_OPTIONS.max, 5, 200),
    nameColor: pick(params.get("nc"), ["chatter", "platform", "white"], DEFAULT_OPTIONS.nameColor),
    accountColor: pick(params.get("ac"), ["platform", "white"], DEFAULT_OPTIONS.accountColor),
    font: pick(
      params.get("fn"),
      ["inter", "montserrat", "poppins", "oswald", "anton", "impact", "futura"],
      DEFAULT_OPTIONS.font
    ),
    timestamps: params.get("ts") === "1",
    twitch: splitList(params.get("twitch")),
    kick: splitList(params.get("kick")),
    xQuery: (params.get("xq") || "").trim(),
  };
}

export function buildQuery(o: OverlayOptions): string {
  const p = new URLSearchParams();
  p.set("badge", o.badge);
  p.set("bg", o.bg);
  p.set("shadow", o.shadow ? "1" : "0");
  p.set("size", o.size);
  p.set("max", String(o.max));
  p.set("nc", o.nameColor);
  p.set("ac", o.accountColor);
  p.set("fn", o.font);
  if (o.timestamps) p.set("ts", "1");
  if (o.twitch.length) p.set("twitch", o.twitch.join(","));
  if (o.kick.length) p.set("kick", o.kick.join(","));
  if (o.xQuery) p.set("xq", o.xQuery);
  return p.toString();
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}
