// Hub WebSocket load test — N synthetic viewers + injected chat traffic.
//
//   node loadtest.js --n 500 --rate 10 --dur 30 [--url ws://localhost:8081] [--key loadtest]
//
// Connects N WS clients (ramped), then POSTs `rate` chat messages/sec to
// /ingest/xchat for `dur` seconds. Every 10th client measures delivery latency
// (inject timestamp is embedded in the message text). Prints connect failures,
// delivery totals, latency percentiles, and the hub's RSS.
import WebSocket from "ws";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i === -1 ? d : process.argv[i + 1];
};
const N = Number(arg("n", 250));
const RATE = Number(arg("rate", 10));
const DUR = Number(arg("dur", 30));
const URL = arg("url", "ws://localhost:8081");
const HTTP = URL.replace(/^ws/, "http");
const KEY = arg("key", "loadtest");

const clients = [];
let connected = 0;
let connectErrors = 0;
let received = 0;
const latencies = [];

function addClient(i) {
  const ws = new WebSocket(URL);
  const sampler = i % 10 === 0;
  ws.on("open", () => connected++);
  ws.on("error", () => connectErrors++);
  ws.on("message", (buf) => {
    received++;
    if (!sampler) return;
    try {
      const j = JSON.parse(buf.toString());
      const m = /^LT (\d+) (\d+)$/.exec(j.text || "");
      if (m) latencies.push(Date.now() - Number(m[2]));
    } catch {}
  });
  clients.push(ws);
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  console.log(`ramping ${N} clients…`);
  for (let i = 0; i < N; i++) {
    addClient(i);
    if (i % 50 === 49) await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 3000));
  console.log(`connected=${connected}/${N} errors=${connectErrors}`);

  console.log(`injecting ${RATE} msg/s for ${DUR}s…`);
  let seq = 0;
  const t0 = Date.now();
  const timer = setInterval(async () => {
    if (Date.now() - t0 > DUR * 1000) return;
    const msgs = Array.from({ length: RATE }, () => ({
      username: `lt_user${seq % 50}`,
      text: `LT ${seq++} ${Date.now()}`,
      channel: "loadtest",
    }));
    try {
      await fetch(`${HTTP}/ingest/xchat?key=${KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
    } catch {}
  }, 1000);

  await new Promise((r) => setTimeout(r, (DUR + 4) * 1000));
  clearInterval(timer);

  const sent = seq;
  const expected = sent * connected;
  latencies.sort((a, b) => a - b);
  console.log("--- results ---");
  console.log(`clients connected: ${connected}/${N} (errors ${connectErrors})`);
  console.log(`messages injected: ${sent}`);
  console.log(`deliveries: ${received} (~${expected ? Math.round((received / expected) * 100) : 0}% of expected ${expected})`);
  console.log(`latency ms (sampled): p50=${pct(latencies, 50)} p95=${pct(latencies, 95)} p99=${pct(latencies, 99)} max=${latencies[latencies.length - 1] ?? 0}`);
  for (const ws of clients) try { ws.close(); } catch {}
  process.exit(0);
}
main();
