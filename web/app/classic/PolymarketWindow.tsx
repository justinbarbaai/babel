"use client";

import { useEffect, useState } from "react";

type Poly = { title: string; label: string; prob: number; slug: string | null };

function parse(events: unknown[]): Poly[] {
  const out: Poly[] = [];
  for (const ev of events) {
    const e = ev as { title?: string; slug?: string; markets?: unknown[] };
    const markets = (e.markets || []).filter((mm) => {
      const m = mm as { outcomes?: string; outcomePrices?: string; active?: boolean; closed?: boolean };
      return m.outcomes && m.outcomePrices && m.active && !m.closed;
    });
    if (!markets.length || !e.title) continue;
    try {
      const m = (markets as { volume24hr?: number; outcomes: string; outcomePrices: string }[])
        .slice()
        .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))[0];
      const o: string[] = JSON.parse(m.outcomes);
      const p: string[] = JSON.parse(m.outcomePrices);
      let label = "Yes";
      let prob = 0;
      if (o.includes("Yes")) {
        prob = parseFloat(p[o.indexOf("Yes")]);
        label = "Yes";
      } else {
        let best = 0;
        let bi = 0;
        p.forEach((x, i) => { const v = parseFloat(x); if (v > best) { best = v; bi = i; } });
        prob = best;
        label = o[bi];
      }
      if (prob > 0 && prob <= 1) out.push({ title: e.title, label, prob, slug: e.slug || null });
    } catch {}
  }
  return out.slice(0, 12);
}

export function PolymarketWindow() {
  const [items, setItems] = useState<Poly[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("https://gamma-api.polymarket.com/events?closed=false&active=true&order=volume24hr&ascending=false&limit=40")
        .then((r) => r.json())
        .then((j) => { if (alive && Array.isArray(j)) setItems(parse(j)); })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="poly-win">
      {items.length === 0 && <div className="news-empty">Loading odds…</div>}
      {items.map((it, i) => (
        <a
          key={i}
          className="poly-row"
          href={it.slug ? `https://polymarket.com/event/${it.slug}` : "https://polymarket.com"}
          target="_blank"
          rel="noreferrer"
          title={it.title}
        >
          <span className="poly-q">{it.title}</span>
          <span className="poly-bar"><span className="poly-fill" style={{ width: `${Math.round(it.prob * 100)}%` }} /></span>
          <span className="poly-pct">{Math.round(it.prob * 100)}%</span>
        </a>
      ))}
    </div>
  );
}
