"use client";

import { useEffect, useState } from "react";

type Sentiment = "bullish" | "bearish" | "neutral";
type NewsItem = {
  title: string;
  url: string;
  source: string;
  ts: number;
  summary: string;
  image: string | null;
  sentiment: Sentiment;
};

function ago(ts: number, now: number): string {
  if (!ts) return "";
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Sentiment chip — only shown for bullish/bearish (neutral stays unlabeled to
// keep the wire clean and avoid tagging ambiguous headlines).
function SentimentChip({ s }: { s: Sentiment }) {
  if (s === "neutral") return null;
  return <span className={`wire-sent wire-sent-${s}`}>{s === "bullish" ? "Bullish" : "Bearish"}</span>;
}

function Meta({ it, now }: { it: NewsItem; now: number }) {
  return (
    <span className="wire-meta">
      <span className="wire-src">{it.source}</span>
      <span className="wire-dot">·</span>
      <span className="wire-time">{ago(it.ts, now)}</span>
      <SentimentChip s={it.sentiment} />
    </span>
  );
}

export function NewsWire() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    setNow(Date.now());
    const load = async () => {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) return;
        const j = await res.json();
        if (!alive || !Array.isArray(j.items)) return;
        setItems(j.items);
        setNow(Date.now());
      } catch {}
    };
    load();
    const t = setInterval(load, 180_000);
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(clock);
    };
  }, []);

  return (
    <div className="wire">
      <div className="wire-masthead">
        <span className="wire-mast-kicker">The Wire</span>
        <span className="wire-mast-note">AI · stocks · crypto · updated live</span>
      </div>

      {!items ? (
        <>
          <div className="wire-front">
            <div className="wire-lead wire-skel" />
            <div className="wire-seconds">
              <div className="wire-second wire-skel" />
              <div className="wire-second wire-skel" />
            </div>
          </div>
          <div className="wire-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="wire-row wire-skel" />
            ))}
          </div>
        </>
      ) : (
        <Wire items={items} now={now} />
      )}
    </div>
  );
}

function Wire({ items, now }: { items: NewsItem[]; now: number }) {
  const lead = items[0];
  const seconds = items.slice(1, 3);
  const rest = items.slice(3);

  return (
    <>
      {/* front page: one lead + two secondary */}
      <div className="wire-front">
        {lead && (
          <a className="wire-lead" href={lead.url} target="_blank" rel="noreferrer">
            <span
              className="wire-lead-img"
              style={lead.image ? { backgroundImage: `url(${lead.image})` } : undefined}
            />
            <span className="wire-lead-body">
              <Meta it={lead} now={now} />
              <h2 className="wire-lead-title">{lead.title}</h2>
              {lead.summary && <p className="wire-lead-sum">{lead.summary}</p>}
            </span>
          </a>
        )}
        <div className="wire-seconds">
          {seconds.map((it) => (
            <a key={it.url} className="wire-second" href={it.url} target="_blank" rel="noreferrer">
              {it.image ? (
                <img className="wire-second-thumb" src={it.image} alt="" loading="lazy" />
              ) : (
                <span className="wire-second-thumb wire-thumb-empty" />
              )}
              <span className="wire-second-body">
                <Meta it={it} now={now} />
                <span className="wire-second-title">{it.title}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* the wire: ledger of headlines */}
      <div className="wire-list">
        {rest.map((it) => (
          <a key={it.url} className="wire-row" href={it.url} target="_blank" rel="noreferrer">
            <span className="wire-row-body">
              <span className="wire-row-title">{it.title}</span>
              <Meta it={it} now={now} />
            </span>
            {it.image ? (
              <img className="wire-row-thumb" src={it.image} alt="" loading="lazy" />
            ) : (
              <span className="wire-row-thumb wire-thumb-empty" />
            )}
          </a>
        ))}
      </div>
    </>
  );
}
