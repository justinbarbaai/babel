import type { CSSProperties } from "react";

// The Market Bubble mark (real brand vector at /public/mb-icon.svg), rendered as
// a currentColor mask so it flips ink/cream with the theme.
export function MBMark({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  return (
    <span
      className="mb-mark"
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    />
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

// Integrated logotype — the real brand vector at /public/mb-logotype.svg,
// rendered as a currentColor mask (used large: boot / hero).
export function MBLockup({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`mb-lockup ${className || ""}`}
      role="img"
      aria-label="Market Bubble"
      style={style}
    />
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
