// Shared description of an overlay's look + which channels it follows.
// Everything here is encoded into the /overlay?... link so an OBS browser
// source is fully self-contained.

export type BadgeStyle = "full" | "channel" | "logo" | "text" | "dot";
export type BgStyle = "glass" | "solid" | "none";
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
  // Channels this overlay should make the hub follow.
  twitch: string;
  kick: string;
  xQuery: string;
}

export const DEFAULT_OPTIONS: OverlayOptions = {
  badge: "full",
  bg: "glass",
  shadow: true,
  size: "md",
  max: 40,
  nameColor: "chatter",
  accountColor: "white",
  font: "montserrat",
  twitch: "",
  kick: "",
  xQuery: "",
};

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return value && (allowed as string[]).includes(value) ? (value as T) : fallback;
}

export function parseOptions(params: URLSearchParams): OverlayOptions {
  return {
    badge: pick(params.get("badge"), ["full", "channel", "logo", "text", "dot"], DEFAULT_OPTIONS.badge),
    bg: pick(params.get("bg"), ["glass", "solid", "none"], DEFAULT_OPTIONS.bg),
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
    twitch: (params.get("twitch") || "").trim(),
    kick: (params.get("kick") || "").trim(),
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
  if (o.twitch) p.set("twitch", o.twitch);
  if (o.kick) p.set("kick", o.kick);
  if (o.xQuery) p.set("xq", o.xQuery);
  return p.toString();
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}
