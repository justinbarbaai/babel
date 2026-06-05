import { NextResponse } from "next/server";

// Crypto / trading headline feeds. Fetched server-side so the browser never
// hits a cross-origin RSS endpoint, and cached for 5 min via Next's fetch cache.
const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "The Block", url: "https://www.theblock.co/rss.xml" },
];

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  ts: number;
  summary: string;
  image: string | null;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function clean(s: string | null): string {
  if (!s) return "";
  return decodeEntities(
    s
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function grab(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : null;
}

function findImage(block: string): string | null {
  const media = block.match(/<media:(?:content|thumbnail)[^>]*\burl="([^"]+)"/i);
  if (media) return media[1];
  const enc = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*(?:type="image|>)/i);
  if (enc) return enc[1];
  const img = block.match(/<img[^>]*\bsrc="([^"]+)"/i);
  if (img) return img[1];
  return null;
}

function parseFeed(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/).slice(1);
  for (const raw of blocks) {
    const block = raw.split("</item>")[0];
    const title = clean(grab(block, "title"));
    let url = clean(grab(block, "link"));
    // Atom-style <link href="..."/> fallback
    if (!url) {
      const href = block.match(/<link[^>]*\bhref="([^"]+)"/i);
      if (href) url = href[1];
    }
    if (!title || !url) continue;
    const dateStr = clean(grab(block, "pubDate") || grab(block, "dc:date") || "");
    const ts = dateStr ? Date.parse(dateStr) : NaN;
    const summary = clean(grab(block, "description") || grab(block, "content:encoded") || "").slice(0, 200);
    items.push({
      title,
      url,
      source,
      ts: Number.isFinite(ts) ? ts : 0,
      summary,
      image: findImage(block),
    });
  }
  return items;
}

async function fetchFeed(feed: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed.name);
  } catch {
    return [];
  }
}

export async function GET() {
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat();

  // Dedupe by URL, then by normalized title.
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const it of all) {
    const key = it.url.split("?")[0];
    const tkey = it.title.toLowerCase().slice(0, 60);
    if (seen.has(key) || seen.has(tkey)) continue;
    seen.add(key);
    seen.add(tkey);
    deduped.push(it);
  }

  deduped.sort((a, b) => b.ts - a.ts);

  return NextResponse.json(
    { items: deduped.slice(0, 48) },
    { headers: { "cache-control": "public, max-age=120, s-maxage=300" } }
  );
}
