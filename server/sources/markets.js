// "The Tape" data for the /market page.
//  - Crypto: CoinGecko (no key) — price + 24h %.
//  - Equities & commodities: Finnhub (free key, 60 req/min) via liquid ETF
//    proxies (SPY≈S&P 500, etc.) since index/futures symbols are gated on free
//    tiers but the % move tracks the underlying closely.
// Cached so the route doesn't hammer either API. Degrades gracefully: with no
// Finnhub key, crypto still works and the stock/commodity groups come back empty.

const EQUITIES = [
  { ticker: "SPY", name: "S&P 500" },
  { ticker: "QQQ", name: "Nasdaq 100" },
  { ticker: "DIA", name: "Dow Jones" },
  { ticker: "IWM", name: "Russell 2000" },
];
const COMMODITIES = [
  { ticker: "GLD", name: "Gold" },
  { ticker: "SLV", name: "Silver" },
  { ticker: "USO", name: "Crude Oil" },
];
const CRYPTO = [
  { id: "bitcoin", sym: "BTC", name: "Bitcoin" },
  { id: "ethereum", sym: "ETH", name: "Ethereum" },
  { id: "solana", sym: "SOL", name: "Solana" },
  { id: "hyperliquid", sym: "HYPE", name: "Hyperliquid" },
  { id: "ripple", sym: "XRP", name: "XRP" },
  { id: "dogecoin", sym: "DOGE", name: "Dogecoin" },
];

async function finnhubQuote(ticker, key) {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  const j = await res.json();
  // c = current price, dp = percent change, pc = previous close.
  if (!j || !j.c) return null;
  const changePct = typeof j.dp === "number" ? j.dp : j.pc ? ((j.c - j.pc) / j.pc) * 100 : 0;
  return { price: j.c, changePct };
}

async function finnhubGroup(list, key) {
  const out = [];
  for (const it of list) {
    try {
      const q = await finnhubQuote(it.ticker, key);
      if (q) out.push({ name: it.name, ticker: it.ticker, price: q.price, changePct: q.changePct });
    } catch {}
  }
  return out;
}

async function fetchCryptoOnce() {
  const ids = CRYPTO.map((c) => c.id).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=false`,
    { headers: { accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`); // 429s often — caller retries
  const arr = await res.json();
  const byId = new Map((Array.isArray(arr) ? arr : []).map((c) => [c.id, c]));
  const out = [];
  for (const c of CRYPTO) {
    const d = byId.get(c.id);
    if (!d) continue;
    out.push({
      name: c.name,
      ticker: c.sym,
      price: d.current_price,
      changePct: d.price_change_percentage_24h ?? 0,
    });
  }
  return out;
}

// CoinGecko's free tier rate-limits often; one quick retry smooths transient 429s.
async function fetchCryptoGroup() {
  try {
    return await fetchCryptoOnce();
  } catch {
    await new Promise((r) => setTimeout(r, 900));
    try {
      return await fetchCryptoOnce();
    } catch {
      return [];
    }
  }
}

// Last successful rows per group, so a transient failure in one source (e.g. a
// CoinGecko 429) never blanks that section — we keep showing its last-good data
// while the others update independently.
let lastGood = { equities: [], crypto: [], commodities: [] };
let cache = { at: 0, data: null };

export async function fetchMarkets(finnhubKey, { ttlMs = 60 * 1000 } = {}) {
  if (cache.data && Date.now() - cache.at < ttlMs) return cache.data;

  const [crypto, equities, commodities] = await Promise.all([
    fetchCryptoGroup(),
    finnhubKey ? finnhubGroup(EQUITIES, finnhubKey).catch(() => []) : Promise.resolve([]),
    finnhubKey ? finnhubGroup(COMMODITIES, finnhubKey).catch(() => []) : Promise.resolve([]),
  ]);

  // Update last-good only when a fetch actually returned rows.
  if (crypto.length) lastGood.crypto = crypto;
  if (equities.length) lastGood.equities = equities;
  if (commodities.length) lastGood.commodities = commodities;

  const data = {
    equities: equities.length ? equities : lastGood.equities,
    crypto: crypto.length ? crypto : lastGood.crypto,
    commodities: commodities.length ? commodities : lastGood.commodities,
    hasKey: Boolean(finnhubKey),
    updatedAt: Date.now(),
  };
  cache = { at: Date.now(), data };
  return data;
}
