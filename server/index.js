import "dotenv/config";
import http from "node:http";
import { WebSocketServer } from "ws";
import { TwitchSource } from "./sources/twitch.js";
import { KickSource } from "./sources/kick.js";
import { XSource } from "./sources/x.js";
import { SOURCE_COLORS } from "./sources/constants.js";
import { EmoteResolver } from "./sources/emoteResolver.js";

const PORT = Number(process.env.PORT) || 8080;

function splitChannels(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Live config — seeded from env, mutable from the UI. Twitch/Kick each support
// multiple channels; X is a single search query/rule.
const config = {
  twitchChannels: splitChannels(process.env.TWITCH_CHANNEL),
  kickChannels: splitChannels(process.env.KICK_CHANNEL),
  xQuery: process.env.X_QUERY || "",
};

const kickOpts = {
  pusherKey: process.env.KICK_PUSHER_KEY || "32cbd69e4b950bf97679",
  cluster: process.env.KICK_PUSHER_CLUSTER || "us2",
  chatroomId: process.env.KICK_CHATROOM_ID || null,
};
const xOpts = {
  bearerToken: process.env.X_BEARER_TOKEN || "",
};

// Shared emote resolver (7TV + BTTV + FFZ) — caches global + per-channel sets.
const emotes = new EmoteResolver();

// ---- Browser clients ----
const clients = new Set();

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const ws of clients) {
    // Private clients (the pop-out reader) only get their own sources' feed.
    if (ws._private) continue;
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// ---- Source manager ----
// twitch/kick hold an array of sources (one per channel); x holds one source.
let sources = { twitch: [], kick: [], x: null };

const status = {
  twitch: { connected: false, channel: config.twitchChannels.join(", ") },
  kick: { connected: false, channel: config.kickChannels.join(", ") },
  x: { connected: false, channel: config.xQuery },
};

// A platform is "connected" if any of its channels are; channel shows the list.
function platformStatus(platform) {
  if (platform === "x") {
    return { connected: Boolean(sources.x && sources.x.connected), channel: config.xQuery };
  }
  const list = sources[platform] || [];
  const channels = platform === "twitch" ? config.twitchChannels : config.kickChannels;
  return { connected: list.some((s) => s.connected), channel: channels.join(", ") };
}

function emitStatus(platform) {
  const st = platformStatus(platform);
  status[platform] = st;
  broadcast({ type: "status", source: platform, connected: st.connected, channel: st.channel });
}

function wireSource(source, platform) {
  source.on("message", (msg) => broadcast(msg));
  source.on("status", () => emitStatus(platform));
  source.on("error", (err) => {
    console.warn(`[${source.constructor.name}]`, err.message);
  });
}

function startSources() {
  stopSources();

  sources.twitch = config.twitchChannels.map((ch) => {
    const s = new TwitchSource(ch, { emotes });
    wireSource(s, "twitch");
    return s;
  });
  sources.kick = config.kickChannels.map((ch) => {
    const s = new KickSource(ch, { ...kickOpts, emotes });
    wireSource(s, "kick");
    return s;
  });
  sources.x = new XSource(config.xQuery, xOpts);
  wireSource(sources.x, "x");

  for (const s of sources.twitch) s.start();
  for (const s of sources.kick) s.start();
  sources.x.start();

  for (const platform of ["twitch", "kick", "x"]) {
    status[platform] = platformStatus(platform);
  }
  broadcastStatusSnapshot();
}

function stopSources() {
  for (const platform of ["twitch", "kick"]) {
    for (const s of sources[platform]) {
      s.removeAllListeners();
      s.stop();
    }
    sources[platform] = [];
  }
  if (sources.x) {
    sources.x.removeAllListeners();
    sources.x.stop();
    sources.x = null;
  }
}

// ---- Private per-connection subscriptions ----
// The pop-out reader gets its own dedicated Twitch/Kick sources routed only to
// its socket, independent of the shared overlay feed. X is excluded (one
// connection per token), so private readers are Twitch + Kick only.
function teardownPrivate(ws) {
  if (ws._sources) {
    for (const s of ws._sources) {
      s.removeAllListeners();
      s.stop();
    }
  }
  ws._sources = [];
}

function setupPrivate(ws, twitchChannels, kickChannels) {
  teardownPrivate(ws);
  ws._private = true;
  const send = (obj) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  };
  const build = (platform, channels, makeSource) =>
    channels.map((ch) => {
      const s = makeSource(ch);
      s._platform = platform;
      s.on("message", (msg) => send(msg));
      s.on("status", () => {
        const list = ws._sources.filter((x) => x._platform === platform);
        send({
          type: "status",
          source: platform,
          connected: list.some((x) => x.connected),
          channel: channels.join(", "),
        });
      });
      s.on("error", () => {});
      return s;
    });
  ws._sources = [
    ...build("twitch", twitchChannels, (ch) => new TwitchSource(ch, { emotes })),
    ...build("kick", kickChannels, (ch) => new KickSource(ch, { ...kickOpts, emotes })),
  ];
  for (const s of ws._sources) s.start();
}

function broadcastStatusSnapshot() {
  for (const source of ["twitch", "kick", "x"]) {
    broadcast({
      type: "status",
      source,
      connected: status[source].connected,
      channel: status[source].channel,
    });
  }
}

function sendConfig(ws) {
  ws.send(
    JSON.stringify({
      type: "config",
      config,
      colors: SOURCE_COLORS,
      xEnabled: Boolean(xOpts.bearerToken),
    })
  );
  for (const source of ["twitch", "kick", "x"]) {
    ws.send(
      JSON.stringify({
        type: "status",
        source,
        connected: status[source].connected,
        channel: status[source].channel,
      })
    );
  }
}

// ---- HTTP + WebSocket server ----
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, status }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  clients.add(ws);
  sendConfig(ws);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "config") {
      // Private reader: build dedicated sources for this socket only.
      if (msg.scope === "private") {
        const tw = Array.isArray(msg.twitchChannels)
          ? msg.twitchChannels.map((c) => String(c).trim()).filter(Boolean)
          : [];
        const kk = Array.isArray(msg.kickChannels)
          ? msg.kickChannels.map((c) => String(c).trim()).filter(Boolean)
          : [];
        setupPrivate(ws, tw, kk);
        return;
      }
      // Live reconfigure of which channels/handle to follow.
      if (Array.isArray(msg.twitchChannels))
        config.twitchChannels = msg.twitchChannels.map((c) => String(c).trim()).filter(Boolean);
      if (Array.isArray(msg.kickChannels))
        config.kickChannels = msg.kickChannels.map((c) => String(c).trim()).filter(Boolean);
      if (typeof msg.xQuery === "string") config.xQuery = msg.xQuery.trim();
      // Bring-your-own X token: a user can supply their own bearer token from
      // the control panel to enable X with their own credentials/cost. Kept
      // server-side only (never echoed back or put in the overlay link).
      if (typeof msg.xToken === "string" && msg.xToken.trim())
        xOpts.bearerToken = msg.xToken.trim();
      console.log("Reconfiguring sources:", config);
      startSources();
      broadcast({ type: "config", config, colors: SOURCE_COLORS, xEnabled: Boolean(xOpts.bearerToken) });
    }
  });

  ws.on("close", () => {
    teardownPrivate(ws);
    clients.delete(ws);
  });
  ws.on("error", () => {
    teardownPrivate(ws);
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Aggregator hub listening on :${PORT}`);
  console.log("Config:", config);
  if (!xOpts.bearerToken) console.log("X source disabled (no X_BEARER_TOKEN).");
  startSources();
});

// Graceful shutdown.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n${sig} received, shutting down.`);
    stopSources();
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000);
  });
}
