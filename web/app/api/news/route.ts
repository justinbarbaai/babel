import { NextResponse } from "next/server";

// Crypto / trading headline feeds. Fetched server-side so the browser never
// hits a cross-origin RSS endpoint, and cached for 5 min via Next's fetch cache.
const FEEDS = [
  // Crypto
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "The Block", url: "https://www.theblock.co/rss.xml" },
  // Mainstream markets
  { name: "CNBC", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
  { name: "CNBC", url: "https://www.cnbc.com/id/10000115/device/rss/rss.html" },
  { name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
];

export type Sentiment = "bullish" | "bearish" | "neutral";

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  ts: number;
  summary: string;
  image: string | null;
  sentiment: Sentiment;
};

// Lightweight keyword sentiment. Imperfect by design — a quick directional read,
// not financial analysis. Word-boundary matched so "rally" ≠ "rallying"-only etc.
const BULLISH = [
  "surge", "surges", "soar", "soars", "rally", "rallies", "jump", "jumps", "gain", "gains",
  "rise", "rises", "rose", "climb", "climbs", "rebound", "recovery", "record high",
  "all-time high", "ath", "breakout", "bullish", "outperform", "beats", "upgrade", "spikes",
  "tops", "boom", "rebounds", "soaring", "skyrocket", "pump", "green", "buy",
];
const BEARISH = [
  "crash", "crashes", "plunge", "plunges", "slump", "tumble", "tumbles", "fall", "falls",
  "fell", "drop", "drops", "sink", "sinks", "selloff", "sell-off", "bearish", "downgrade",
  "miss", "misses", "warning", "fears", "fear", "liquidation", "liquidated", "hack",
  "exploit", "lawsuit", "ban", "crackdown", "plummet", "slides", "dump", "dumped",
  "recession", "bankruptcy", "losses", "loss", "red", "collapse", "collapses",
  "slashed", "cuts", "erased", "erases", "wiped", "cratering", "cratered", "bleed",
];

function countHits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) n++;
  }
  return n;
}

function classifySentiment(title: string, summary: string): Sentiment {
  const text = `${title} ${summary}`;
  const b = countHits(text, BULLISH);
  const s = countHits(text, BEARISH);
  if (b > s) return "bullish";
  if (s > b) return "bearish";
  return "neutral";
}

// Topic relevance — keep the wire to crypto + stocks/markets and drop the
// general business/health/lifestyle stories the mainstream feeds mix in
// (e.g. GLP-1 drugs, coffee chains). Crypto feeds are whitelisted below; the
// mainstream feeds must pass this check.
const CRYPTO_SOURCES = new Set(["CoinDesk", "Cointelegraph", "Decrypt", "The Block"]);
// AI + stocks + crypto only. Macro (Fed/inflation/rates/treasury/economy) and
// commodities are intentionally excluded — those stories pass only if they also
// mention a stock, the market, or crypto.
const TOPIC_TERMS = [
  // crypto
  "crypto", "cryptocurrency", "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
  "xrp", "ripple", "dogecoin", "hyperliquid", "altcoin", "memecoin", "stablecoin",
  "token", "tokens", "coin", "coins", "blockchain", "defi", "nft", "web3", "binance",
  "coinbase", "kraken", "mining", "miner", "halving",
  // AI
  "ai", "artificial intelligence", "chatgpt", "openai", "anthropic", "llm", "gpt",
  "chatbot", "nvidia", "semiconductor", "semiconductors", "chip", "chips", "gpu", "gpus",
  "data center", "datacenter", "machine learning",
  // stocks / equities
  "stock", "stocks", "shares", "share", "equity", "equities", "market", "markets",
  "nasdaq", "dow", "s&p", "sp500", "russell", "index", "indices", "wall street", "nyse",
  "dividend", "earnings", "revenue", "guidance", "ipo", "listing", "buyback", "merger",
  "acquisition", "valuation", "ticker", "analyst", "upgrade", "downgrade", "rating",
  "etf", "etfs",
  // market action / participants
  "hedge fund", "portfolio", "investor", "investors", "investing", "trading", "trader",
  "bull", "bear", "bullish", "bearish", "rally", "selloff", "sell-off", "short squeeze",
  "polymarket", "prediction market",
];
const TOPIC_RE = new RegExp(
  "\\b(" + TOPIC_TERMS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "i"
);
const CASHTAG = /\$[A-Za-z]{1,6}\b/; // $BTC, $NVDA
const TICKER_PAREN = /\([A-Z]{1,5}\)/; // "(KO)", "(AMD)"

function isMarketRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  return CASHTAG.test(text) || TICKER_PAREN.test(text) || TOPIC_RE.test(text);
}

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
      sentiment: classifySentiment(title, summary),
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

  // Keep only crypto + stocks/markets stories. Crypto feeds pass automatically;
  // mainstream feeds must mention a market/stock topic.
  const onTopic = deduped.filter(
    (it) => CRYPTO_SOURCES.has(it.source) || isMarketRelevant(it.title, it.summary)
  );

  onTopic.sort((a, b) => b.ts - a.ts);

  // Balance across sources so no single feed (e.g. Yahoo's high volume) floods
  // the wire. Round-robin the newest from each source in turn.
  const bySource = new Map<string, NewsItem[]>();
  for (const it of onTopic) {
    if (!bySource.has(it.source)) bySource.set(it.source, []);
    bySource.get(it.source)!.push(it);
  }
  const queues = [...bySource.values()];
  const balanced: NewsItem[] = [];
  let progressed = true;
  while (balanced.length < 48 && progressed) {
    progressed = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        balanced.push(next);
        progressed = true;
        if (balanced.length >= 48) break;
      }
    }
  }

  return NextResponse.json(
    { items: balanced },
    { headers: { "cache-control": "public, max-age=120, s-maxage=300" } }
  );
}
