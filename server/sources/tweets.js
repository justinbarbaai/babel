// Recent posts from the show's X accounts for the /content "On X" section.
// Uses the X v2 recent-search endpoint with the same bearer token as the chat
// stream. Cached so the route doesn't burn the search rate limit.

const RECENT_URL = "https://api.x.com/2/tweets/search/recent";

// The show accounts whose posts populate the feed. Handles without the @.
export const SHOW_HANDLES = ["MarketBubble", "Banks", "blknoiz06"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Keep the feed to market / crypto / trading / show content — drop off-topic
// personal one-liners. A post qualifies if it mentions a cashtag ($BTC), a
// percentage move, or any of these terms.
const MARKET_TERMS = [
  "market", "markets", "crypto", "bitcoin", "btc", "eth", "ethereum", "solana", "sol",
  "altcoin", "token", "coin", "stablecoin", "defi", "onchain", "on-chain",
  "trade", "trading", "trader", "trades", "long", "short", "leverage", "position",
  "bull", "bear", "bullish", "bearish", "pump", "dump", "rally", "dip", "selloff",
  "sell-off", "breakout", "resistance", "support", "liquidated", "liquidation", "chart",
  "price", "target", "entry", "buy", "sell", "buying", "selling", "accumulate",
  "fed", "cpi", "rate", "rates", "inflation", "nasdaq", "stocks", "stock", "equities",
  "ipo", "valuation", "earnings", "macro", "yields", "saylor", "hyperliquid", "hype",
  "polymarket", "prediction", "bet", "odds", "comp", "bullpen", "invitational",
  "market bubble", "marketbubble", "episode", "guest",
  "voorhees", "venice", "ftx", "binance", "coinbase", "exchange", "wallet",
  // show / broadcast terms so host stream announcements qualify (this is how
  // Banks mostly posts: "LIVE ... COME WATCH ON TWITCH & X").
  "live", "watch", "twitch", "kick", "stream", "streaming", "tonight",
  "show", "shows", "tune",
];
const CASHTAG = /\$[A-Za-z]{2,6}\b/;
const PERCENT = /\d+(\.\d+)?\s?%/;
// Word-boundary match so "sol" doesn't hit "sold", "eth" doesn't hit "whether",
// "ep" doesn't hit "sweep", etc.
const TERM_RE = new RegExp(
  "\\b(" + MARKET_TERMS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "i"
);

function isMarketRelated(text) {
  const t = String(text || "");
  if (!t.trim()) return false;
  return CASHTAG.test(t) || PERCENT.test(t) || TERM_RE.test(t);
}

function prettyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// How many posts to pull per account per refresh. 10 is the X recent-search
// minimum; with 3 accounts that's 30 post-reads (~$0.15 at $0.005/read). Cost
// scales with this number, so keep it low — the chat stream is the bigger spend.
const PER_HANDLE = 10;
const TOTAL = 12; // cards shown in the On X grid

// Fetch + map + market-filter recent original posts for ONE handle. Querying
// each account separately guarantees Banks and @MarketBubble surface even when
// Ansem floods the timeline (a combined query would be all-Ansem by recency).
async function fetchHandle(handle, bearerToken) {
  const params = new URLSearchParams({
    query: `from:${handle} -is:reply -is:retweet`,
    max_results: String(PER_HANDLE),
    "tweet.fields": "created_at,author_id,attachments,referenced_tweets",
    expansions: "author_id,attachments.media_keys",
    "user.fields": "username",
    "media.fields": "preview_image_url,url,type",
  });

  const res = await fetch(`${RECENT_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok) throw new Error(`X recent ${res.status} for ${handle}`);
  const json = await res.json();

  const users = new Map((json?.includes?.users ?? []).map((u) => [u.id, u]));
  const media = new Map((json?.includes?.media ?? []).map((m) => [m.media_key, m]));

  const out = [];
  for (const t of json?.data ?? []) {
    if (!t?.text) continue;
    const username = users.get(t.author_id)?.username || handle;

    let thumb = "";
    for (const k of t.attachments?.media_keys || []) {
      const m = media.get(k);
      if (!m) continue;
      thumb = m.url || m.preview_image_url || "";
      if (thumb) break;
    }

    // Strip t.co links, decode HTML entities X returns (&amp; &lt; ...), and
    // collapse whitespace; drop link-only / empty cards.
    const text = String(t.text)
      .replace(/https?:\/\/t\.co\/\S+/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text && !thumb) continue;
    // Market/crypto/show content only (image-only posts are kept).
    if (text && !isMarketRelated(text)) continue;

    out.push({
      handle: `@${username}`,
      date: prettyDate(t.created_at),
      text,
      media: Boolean(thumb),
      thumb,
      url: `https://x.com/${username}/status/${t.id}`,
      createdAt: t.created_at || "",
    });
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

// Round-robin across accounts so the feed is evened out: one post from each
// account per pass (newest-first within each), until we have `total`. Accounts
// that run dry are skipped, so a quiet account never blocks a busy one.
function balance(groups, total) {
  const queues = groups.filter((g) => g.length);
  const out = [];
  let progressed = true;
  while (out.length < total && progressed) {
    progressed = false;
    for (const q of queues) {
      if (!q.length) continue;
      out.push(q.shift());
      progressed = true;
      if (out.length >= total) break;
    }
  }
  return out;
}

let cache = { at: 0, data: null };

export async function fetchTweets(handles, bearerToken, { ttlMs = 20 * 60 * 1000 } = {}) {
  if (cache.data && Date.now() - cache.at < ttlMs) return cache.data;
  if (!bearerToken) return { tweets: [], updatedAt: Date.now() };

  const list = (handles && handles.length ? handles : SHOW_HANDLES)
    .map((h) => String(h).replace(/^@/, "").trim())
    .filter(Boolean);
  if (!list.length) return { tweets: [], updatedAt: Date.now() };

  let groups;
  try {
    groups = await Promise.all(list.map((h) => fetchHandle(h, bearerToken).catch(() => [])));
  } catch (err) {
    if (cache.data) return cache.data; // serve last good on failure
    return { tweets: [], updatedAt: Date.now(), error: String(err?.message || err) };
  }

  const tweets = balance(groups, TOTAL);
  // If everything came back empty (rate limit / all accounts quiet), keep the
  // previous good feed rather than blanking the section.
  if (!tweets.length && cache.data) return cache.data;

  const data = { tweets, updatedAt: Date.now() };
  cache = { at: Date.now(), data };
  return data;
}
