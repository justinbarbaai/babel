"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollFX } from "./ScrollFX";

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
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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
  const [reading, setReading] = useState<NewsItem | null>(null);

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

  const dateline = now
    ? new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="wire">
      <header className="wire-nameplate">
        <span className="wire-np-side wire-np-left">{dateline}</span>
        <span className="wire-np-title">The Wire</span>
        <span className="wire-np-side wire-np-right">AI · Stocks · Crypto</span>
      </header>
      <div className="wire-rule" />

      {!items ? (
        <Skeleton />
      ) : (
        <Board items={items} now={now} onRead={setReading} />
      )}

      {reading && <Reader item={reading} now={now} onClose={() => setReading(null)} />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="wire-board">
      <div className="wire-main">
        <div className="wire-lead wire-skel" />
        <div className="wire-cols">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="wire-story wire-skel" />
          ))}
        </div>
      </div>
      <aside className="wire-aside">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="wire-latest wire-skel" />
        ))}
      </aside>
    </div>
  );
}

function Board({ items, now, onRead }: { items: NewsItem[]; now: number; onRead: (it: NewsItem) => void }) {
  const lead = items[0];
  const columns = items.slice(1, 13);
  const latest = [...items].sort((a, b) => b.ts - a.ts).slice(0, 10);

  return (
    <div className="wire-board">
      <ScrollFX />
      <div className="wire-main">
        {lead && (
          <button className="wire-lead" data-rv="1" onClick={() => onRead(lead)} type="button">
            <span
              className="wire-lead-img"
              style={lead.image ? { backgroundImage: `url(${lead.image})` } : undefined}
            />
            <span className="wire-lead-body">
              <Meta it={lead} now={now} />
              <h2 className="wire-lead-title">{lead.title}</h2>
              {lead.summary && <p className="wire-lead-sum">{lead.summary}</p>}
              <span className="wire-readlink">Read on the Wire →</span>
            </span>
          </button>
        )}

        <div className="wire-cols">
          {columns.map((it, i) => (
            <button key={it.url} className="wire-story" data-rv={(i % 8) + 1} onClick={() => onRead(it)} type="button">
              {it.image ? (
                <img className="wire-story-thumb" src={it.image} alt="" loading="lazy" />
              ) : null}
              <h3 className="wire-story-title">{it.title}</h3>
              {it.summary && <p className="wire-story-sum">{it.summary}</p>}
              <Meta it={it} now={now} />
            </button>
          ))}
        </div>
      </div>

      <aside className="wire-aside">
        <div className="wire-aside-head">Latest</div>
        {latest.map((it) => (
          <button key={`l-${it.url}`} className="wire-latest" onClick={() => onRead(it)} type="button">
            <span className="wire-latest-title">{it.title}</span>
            <span className="wire-latest-meta">
              {it.source} · {ago(it.ts, now)}
            </span>
          </button>
        ))}
      </aside>
    </div>
  );
}

// ---- on-site reader modal ----
type Article = { image: string | null; siteName: string | null; desc: string; paragraphs: string[] };

function Reader({ item, now, onClose }: { item: NewsItem; now: number; onClose: () => void }) {
  const [art, setArt] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setArt(null);
    fetch(`/api/article?url=${encodeURIComponent(item.url)}`)
      .then((r) => r.json())
      .then((a: Article) => {
        if (alive) {
          setArt(a);
          setLoading(false);
        }
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const hero = art?.image || item.image;
  const paras = art?.paragraphs?.length ? art.paragraphs : item.summary ? [item.summary] : [];
  const words = paras.join(" ").split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.round(words / 220));

  return createPortal(
    <div className="nr-scrim" onClick={onClose}>
      <article
        className="nr"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          el.style.setProperty("--read", max > 0 ? String(el.scrollTop / max) : "0");
        }}
      >
        <div className="nr-progress" aria-hidden="true"><i /></div>
        <button className="nr-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {hero && <div className="nr-hero" style={{ backgroundImage: `url(${hero})` }} />}
        <div className="nr-body">
          <span className="nr-kicker">
            <span className="nr-src">{item.source}</span>
            <span className="wire-dot">·</span>
            <span>{ago(item.ts, now)}</span>
            {!loading && paras.length > 0 && (
              <>
                <span className="wire-dot">·</span>
                <span className="nr-readtime">{readMins} min read</span>
              </>
            )}
            <SentimentChip s={item.sentiment} />
          </span>
          <h1 className="nr-title">{item.title}</h1>
          {loading ? (
            <div className="nr-loading">
              <span className="nr-skel" />
              <span className="nr-skel" />
              <span className="nr-skel short" />
            </div>
          ) : (
            <div className="nr-content">
              {paras.length ? (
                paras.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p className="nr-empty">Preview unavailable — read the full story at the source.</p>
              )}
            </div>
          )}
          <a className="nr-open" href={item.url} target="_blank" rel="noreferrer">
            Read the full article on {item.source} ↗
          </a>
          <div className="nr-colophon">Set in Playfair · The Bubble Dispatch · Market Bubble</div>
        </div>
      </article>
    </div>,
    document.body
  );
}
