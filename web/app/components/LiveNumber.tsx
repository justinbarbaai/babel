"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  /** format the number for display */
  format?: (n: number) => string;
  className?: string;
  /** accepted for compatibility; no longer tweens */
  duration?: number;
  /** flash green/red on change (off by default — kept subtle/optional) */
  flash?: boolean;
};

const defaultFmt = (n: number) => Math.round(n).toLocaleString();

/**
 * Renders a number with steady tabular figures. The odometer "roll" was removed
 * (too busy across the site); values now update instantly. An optional green/red
 * flash on change can be re-enabled per-instance with `flash`.
 */
export function LiveNumber({ value, format = defaultFmt, className = "", flash = false }: Props) {
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const prev = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }
    if (value === prev.current) return;
    if (flash) setDir(value > prev.current ? "up" : "down");
    prev.current = value;
  }, [value, flash]);

  useEffect(() => {
    if (!dir) return;
    const t = setTimeout(() => setDir(null), 720);
    return () => clearTimeout(t);
  }, [dir]);

  return (
    <span className={`live-num ${dir ? `flash-${dir}` : ""} ${className}`.trim()}>{format(value)}</span>
  );
}
