"use client";

import { useEffect, useState } from "react";
import { LiveNumber } from "./LiveNumber";

type Coin = { sym: string; id: string };
const COINS: Coin[] = [
  { sym: "BTC", id: "bitcoin" },
  { sym: "ETH", id: "ethereum" },
  { sym: "SOL", id: "solana" },
  { sym: "HYPE", id: "hyperliquid" },
  { sym: "XRP", id: "ripple" },
  { sym: "DOGE", id: "dogecoin" },
];

type Quote = { sym: string; price: number; change: number };

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// Module-level cache so the tape shows last-good prices instantly across route
// changes (remounts) and never blanks when CoinGecko rate-limits a refresh.
let cachedQuotes: Quote[] = [];

// Live crypto ticker (CoinGecko free API, no key) — refreshes every 60s.
export function Ticker() {
  const [quotes, setQuotes] = useState<Quote[]>(cachedQuotes);

  useEffect(() => {
    let alive = true;
    const ids = COINS.map((c) => c.id).join(",");
    const load = async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) return; // keep last-good on rate limit / error
        const j = await res.json();
        if (!alive) return;
        const next = COINS.map((c) => ({
          sym: c.sym,
          price: j[c.id]?.usd ?? 0,
          change: j[c.id]?.usd_24h_change ?? 0,
        })).filter((q) => q.price > 0);
        if (next.length) {
          cachedQuotes = next;
          setQuotes(next);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!quotes.length) return null;
  // Duplicate the list so the marquee can loop seamlessly.
  const loop = [...quotes, ...quotes];

  return (
    <div className="ticker" aria-label="Live market prices">
      <div className="ticker-track">
        {loop.map((q, i) => (
          <span className="ticker-item" key={i}>
            <span className="ticker-sym">{q.sym}</span>
            <LiveNumber className="ticker-price" value={q.price} format={(n) => `$${fmtPrice(n)}`} duration={800} />
            <span className={`ticker-chg ${q.change >= 0 ? "up" : "down"}`}>
              {q.change >= 0 ? "▲" : "▼"} {Math.abs(q.change).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
