"use client";

import { useEffect, useState } from "react";

type Reading = { value: number; label: string; ts: number };

// Map a 0–100 index value to the project's up/down palette.
function toneFor(v: number): { color: string; key: string } {
  if (v < 25) return { color: "#ea3943", key: "extreme-fear" };
  if (v < 45) return { color: "#f6735f", key: "fear" };
  if (v < 55) return { color: "#e9b949", key: "neutral" };
  if (v < 75) return { color: "#7fd17f", key: "greed" };
  return { color: "#16c784", key: "extreme-greed" };
}

const CX = 140;
const CY = 140;
const R = 104;
const SW = 16;

function pointAt(value: number, radius: number) {
  const angle = (180 - (value / 100) * 180) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

// Crypto Fear & Greed Index (alternative.me, free, no key) — refreshes hourly.
export function FearGreed() {
  const [history, setHistory] = useState<Reading[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("https://api.alternative.me/fng/?limit=8");
        if (!res.ok) return;
        const j = await res.json();
        if (!alive || !Array.isArray(j.data)) return;
        setHistory(
          j.data.map((d: any) => ({
            value: Number(d.value),
            label: d.value_classification,
            ts: Number(d.timestamp) * 1000,
          }))
        );
      } catch {}
    };
    load();
    const t = setInterval(load, 3600_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const now = history?.[0];
  const yesterday = history?.[1];
  const lastWeek = history?.[7];
  const v = now?.value ?? 0;
  const tone = toneFor(v);
  const needle = pointAt(v, R - 22);
  const arcStart = pointAt(0, R);
  const arcEnd = pointAt(100, R);

  return (
    <div className="fng-card">
      <div className="fng-head">
        <span className="fng-kicker">Crypto Fear &amp; Greed</span>
        <span className="fng-source">alternative.me</span>
      </div>

      <div className="fng-gauge">
        <svg viewBox="0 0 280 168" width="100%" role="img" aria-label={`Fear and greed index ${v}`}>
          <defs>
            <linearGradient id="fng-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ea3943" />
              <stop offset="35%" stopColor="#f6735f" />
              <stop offset="50%" stopColor="#e9b949" />
              <stop offset="70%" stopColor="#7fd17f" />
              <stop offset="100%" stopColor="#16c784" />
            </linearGradient>
          </defs>
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="url(#fng-arc)"
            strokeWidth={SW}
            strokeLinecap="round"
            opacity={history ? 1 : 0.25}
          />
          {history && (
            <>
              <line
                x1={CX}
                y1={CY}
                x2={needle.x}
                y2={needle.y}
                stroke="var(--text)"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <circle cx={CX} cy={CY} r={7} fill="var(--text)" />
              <circle cx={needle.x} cy={needle.y} r={5} fill={tone.color} />
            </>
          )}
          <text x={arcStart.x} y={CY + 22} className="fng-end" textAnchor="middle">0</text>
          <text x={arcEnd.x} y={CY + 22} className="fng-end" textAnchor="middle">100</text>
        </svg>

        <div className="fng-readout">
          <span className="fng-value" style={{ color: tone.color }}>
            {history ? v : "—"}
          </span>
          <span className="fng-label">{now?.label ?? "loading"}</span>
        </div>
      </div>

      <div className="fng-history">
        <Stat title="Yesterday" r={yesterday} />
        <Stat title="Last week" r={lastWeek} />
      </div>
    </div>
  );
}

function Stat({ title, r }: { title: string; r?: Reading }) {
  const tone = toneFor(r?.value ?? 0);
  return (
    <div className="fng-stat">
      <span className="fng-stat-num" style={{ color: r ? tone.color : "var(--muted)" }}>
        {r ? r.value : "—"}
      </span>
      <span className="fng-stat-label">{title}</span>
    </div>
  );
}
