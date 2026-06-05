"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  url: string;
  source: string;
  ts: number;
  summary: string;
  image: string | null;
};

const SOURCE_TONE: Record<string, string> = {
  CoinDesk: "#4d8df0",
  Cointelegraph: "#f5b417",
  Decrypt: "#10d1a8",
  "The Block": "#e0533d",
};

function tone(source: string): string {
  return SOURCE_TONE[source] ?? "var(--muted)";
}

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

  if (!items) {
    return (
      <div className="news-wire">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="news-row news-skel" />
        ))}
      </div>
    );
  }

  const lead = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <>
      <div className="news-lead">
        {lead.map((it) => (
          <a key={it.url} className="news-feat" href={it.url} target="_blank" rel="noreferrer">
            <div
              className="news-feat-img"
              style={it.image ? { backgroundImage: `url(${it.image})` } : undefined}
            />
            <div className="news-feat-body">
              <div className="news-meta">
                <span className="news-chip" style={{ color: tone(it.source), borderColor: tone(it.source) }}>
                  {it.source}
                </span>
                <span className="news-time">{ago(it.ts, now)}</span>
              </div>
              <h3 className="news-feat-title">{it.title}</h3>
            </div>
          </a>
        ))}
      </div>

      <div className="news-wire">
        {rest.map((it) => (
          <a key={it.url} className="news-row" href={it.url} target="_blank" rel="noreferrer">
            {it.image ? (
              <img className="news-row-thumb" src={it.image} alt="" loading="lazy" />
            ) : (
              <span className="news-row-thumb news-row-thumb-empty" />
            )}
            <div className="news-row-main">
              <div className="news-meta">
                <span className="news-chip" style={{ color: tone(it.source), borderColor: tone(it.source) }}>
                  {it.source}
                </span>
                <span className="news-time">{ago(it.ts, now)}</span>
              </div>
              <span className="news-row-title">{it.title}</span>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
