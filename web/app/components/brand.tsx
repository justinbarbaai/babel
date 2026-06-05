import type { CSSProperties } from "react";

// The Market Bubble mark: a square speech bubble with a jagged stock line that
// breaks out the top-right as an arrow. Uses currentColor so it flips with theme.
export function MBMark({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {/* speech-bubble square */}
      <path d="M11 13 H53 V47 H30 L22 56 V47 H11 Z" />
      {/* stock line breaking out the top-right corner */}
      <path d="M16 43 L26 33 L32 38 L42 26 L57 9" />
      {/* arrowhead */}
      <path d="M48 9 L57 9 L57 18" />
    </svg>
  );
}

// Serif wordmark — "Market Bubble" stacked, matching the brand lockup.
export function MBWordmark({
  stacked = false,
  className,
  style,
}: {
  stacked?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`mb-wordmark ${stacked ? "stacked" : ""} ${className || ""}`} style={style}>
      <span>Market</span>
      <span>Bubble</span>
    </span>
  );
}

// Logo lockup: mark + wordmark inline.
export function MBLogo({ size = 30, style }: { size?: number; style?: CSSProperties }) {
  return (
    <span className="mb-logo" style={style}>
      <MBMark size={size} />
      <MBWordmark />
    </span>
  );
}
