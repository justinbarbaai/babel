"use client";

import { useEffect, useState } from "react";
import { LiveNumber } from "./LiveNumber";

type Outcome = { label: string; prob: number };
type Card = {
  id: string;
  title: string;
  icon: string | null;
  slug: string | null;
  vol24: number;
  kind: "multi" | "binary";
  outcomes: Outcome[];
};

const SPORT_RE =
  /^(sports|esports|games|nba|nfl|mlb|nhl|soccer|basketball|baseball|football|tennis|dota.?2|cs.?2|csgo|counter.?strike|league.?of.?legends|valorant|mma|ufc|boxing|cricket|golf|f1|formula|hockey|rugby)/i;

function isSport(tags: any[]): boolean {
  return (tags || []).some((t) =>
    SPORT_RE.test(String(t?.slug || t?.label || "").replace(/\s+/g, "-"))
  );
}

function safeParse(s: any): any[] | null {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function buildCards(events: any[]): Card[] {
  const cards: Card[] = [];
  for (const e of events) {
    const markets = (e.markets || []).filter(
      (m: any) => m.outcomes && m.outcomePrices && m.active && !m.closed
    );
    if (!markets.length) continue;

    if (e.negRisk) {
      // Mutually-exclusive multi-candidate market (election, World Cup, Fed).
      const outcomes: Outcome[] = markets
        .map((m: any) => {
          const o = safeParse(m.outcomes);
          const p = safeParse(m.outcomePrices);
          if (!o || !p) return null;
          let yi = o.indexOf("Yes");
          if (yi < 0) yi = 0;
          return { label: m.groupItemTitle || o[yi], prob: parseFloat(p[yi]) };
        })
        .filter((x: Outcome | null): x is Outcome => !!x && x.prob > 0.005)
        .sort((a: Outcome, b: Outcome) => b.prob - a.prob);
      if (outcomes.length < 2) continue;
      cards.push({
        id: String(e.id),
        title: e.title,
        icon: e.icon || e.image || null,
        slug: e.slug || null,
        vol24: Number(e.volume24hr || 0),
        kind: "multi",
        outcomes: outcomes.slice(0, 4),
      });
    } else {
      // Binary Yes/No question — skip the noisy sports prop bundles.
      if (isSport(e.tags)) continue;
      const m = markets
        .slice()
        .sort((a: any, b: any) => (b.volume24hr || 0) - (a.volume24hr || 0))[0];
      const o = safeParse(m.outcomes);
      const p = safeParse(m.outcomePrices);
      if (!o || !p || !(o.includes("Yes") && o.includes("No"))) continue;
      const yes = parseFloat(p[o.indexOf("Yes")]);
      if (!(yes >= 0 && yes <= 1)) continue;
      cards.push({
        id: String(e.id),
        title: e.title,
        icon: e.icon || e.image || null,
        slug: e.slug || null,
        vol24: Number(e.volume24hr || 0),
        kind: "binary",
        outcomes: [{ label: "Yes", prob: yes }],
      });
    }
  }
  return cards.slice(0, 12);
}

// Live Polymarket odds, ordered by 24h volume (Gamma API, no key) — refresh 60s.
export function PolymarketBoard() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(
          "https://gamma-api.polymarket.com/events?closed=false&active=true&order=volume24hr&ascending=false&limit=60"
        );
        if (!res.ok) return;
        const j = await res.json();
        if (!alive || !Array.isArray(j)) return;
        setCards(buildCards(j));
      } catch {}
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mkt-board">
      <div className="mkt-board-head">
        <h2 className="mkt-board-title">Prediction Markets</h2>
        <span className="mkt-board-sub">Live on Polymarket · top markets by 24h volume</span>
      </div>

      {!cards ? (
        <div className="mkt-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mkt-card mkt-card-skel" />
          ))}
        </div>
      ) : (
        <div className="mkt-grid">
          {cards.map((c, i) => (
            <div key={c.id} data-rv={(i % 6) + 1}>
              <MarketCard card={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ card }: { card: Card }) {
  const href = card.slug ? `https://polymarket.com/event/${card.slug}` : "https://polymarket.com";
  return (
    <a className="mkt-card" href={href} rel="noreferrer">
      <div className="mkt-card-head">
        {card.icon ? (
          <img className="mkt-icon" src={card.icon} alt="" loading="lazy" />
        ) : (
          <span className="mkt-icon mkt-icon-fallback" />
        )}
        <span className="mkt-title">{card.title}</span>
      </div>

      {card.kind === "binary" ? (
        <BinaryBody prob={card.outcomes[0].prob} />
      ) : (
        <MultiBody outcomes={card.outcomes} />
      )}

      <div className="mkt-foot">
        <span className="mkt-vol">{fmtVol(card.vol24)} Vol</span>
        <span className="mkt-go">Trade ↗</span>
      </div>
    </a>
  );
}

function BinaryBody({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100);
  return (
    <div className="mkt-binary">
      <div className="mkt-binary-top">
        <LiveNumber className="mkt-binary-pct" value={pct} format={(n) => `${Math.round(n)}%`} />
        <span className="mkt-binary-yes">chance</span>
      </div>
      <div className="mkt-bar">
        <span className="mkt-bar-fill yes" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MultiBody({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <div className="mkt-multi">
      {outcomes.map((o, i) => {
        const pct = Math.round(o.prob * 100);
        return (
          <div className="mkt-row" key={i}>
            <span className="mkt-row-label" title={o.label}>{o.label}</span>
            <div className="mkt-row-bar">
              <span className="mkt-row-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
            <LiveNumber className="mkt-row-pct" value={pct} format={(n) => `${Math.round(n)}%`} />
          </div>
        );
      })}
    </div>
  );
}
