"use client";

import { useEffect, useState } from "react";

type NewsItem = { title: string; url: string; source: string };

export function NewsWindow() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: NewsItem[] = Array.isArray(d) ? d : d.items || d.articles || [];
        setItems(list.slice(0, 30));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="news-win">
      {items.length === 0 && <div className="news-empty">Tuning the wire…</div>}
      {items.map((it, i) => (
        <a key={i} className="news-row" href={it.url} target="_blank" rel="noreferrer" title={it.title}>
          <span className="news-src">{it.source}</span>
          <span className="news-title">{it.title}</span>
        </a>
      ))}
    </div>
  );
}
