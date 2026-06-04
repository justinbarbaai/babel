import type { CSSProperties } from "react";

type LogoProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function TwitchLogo({ size = 16, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z" />
    </svg>
  );
}

export function KickLogo({ size = 16, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M1.333 0h6.667v5.333h2.667V2.667h2.666V0H20v8h-2.667v2.667h-2.666v2.666h2.666V16H20v8h-6.667v-2.667h-2.666V18.667H8V24H1.333z" />
    </svg>
  );
}

export function XLogo({ size = 16, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export type SourceKey = "twitch" | "kick" | "x";

export function SourceLogo({
  source,
  size = 16,
  style,
}: {
  source: SourceKey;
  size?: number;
  style?: CSSProperties;
}) {
  if (source === "twitch") return <TwitchLogo size={size} style={style} />;
  if (source === "kick") return <KickLogo size={size} style={style} />;
  return <XLogo size={size} style={style} />;
}

// Market Bubble wordmark mark — the angular bracket under the name from the brand.
export function MarketBubbleMark({ size = 18, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d="M3 7 L12 16 L21 7" />
      <path d="M8 19 L12 15 L16 19" />
    </svg>
  );
}

export const SOURCE_LABELS: Record<SourceKey, string> = {
  twitch: "Twitch",
  kick: "Kick",
  x: "X",
};

export const SOURCE_COLORS: Record<SourceKey, string> = {
  twitch: "#9146FF",
  kick: "#53FC18",
  x: "#FFFFFF",
};
