import "dotenv/config";
import http from "node:http";
import { WebSocketServer } from "ws";
import { TwitchSource } from "./sources/twitch.js";
import { KickSource } from "./sources/kick.js";
import { XSource } from "./sources/x.js";
import { SOURCE_COLORS } from "./sources/constants.js";
import { EmoteResolver } from "./sources/emoteResolver.js";

const PORT = Number(process.env.PORT) || 8080;

// Live config — seeded from env, mutable from the UI.
const config = {
  twitchChannel: process.env.TWITCH_CHANNEL || "",
  kickChannel: process.env.KICK_CHANNEL || "",
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
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// ---- Source manager: owns the three live source connections ----
const status = {
  twitch: { connected: false, channel: config.twitchChannel },
  kick: { connected: false, channel: config.kickChannel },
  x: { connected: false, channel: config.xQuery },
};

let sources = { twitch: null, kick: null, x: null };

function wireSource(source) {
  source.on("message", (msg) => broadcast(msg));
  source.on("status", (s) => {
    status[s.source] = { connected: s.connected, channel: s.channel };
    broadcast({ type: "status", ...s });
  });
  source.on("error", (err) => {
    console.warn(`[${source.constructor.name}]`, err.message);
  });
}

function startSources() {
  stopSources();

  sources.twitch = new TwitchSource(config.twitchChannel, { emotes });
  sources.kick = new KickSource(config.kickChannel, { ...kickOpts, emotes });
  sources.x = new XSource(config.xQuery, xOpts);

  for (const key of ["twitch", "kick", "x"]) {
    status[key] = { connected: false, channel: configChannelFor(key) };
    wireSource(sources[key]);
    sources[key].start();
  }
  broadcastStatusSnapshot();
}

function stopSources() {
  for (const key of ["twitch", "kick", "x"]) {
    if (sources[key]) {
      sources[key].removeAllListeners();
      sources[key].stop();
      sources[key] = null;
    }
  }
}

function configChannelFor(key) {
  if (key === "twitch") return config.twitchChannel;
  if (key === "kick") return config.kickChannel;
  return config.xQuery;
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
      // Live reconfigure of which channels/handle to follow.
      if (typeof msg.twitchChannel === "string")
        config.twitchChannel = msg.twitchChannel.trim();
      if (typeof msg.kickChannel === "string")
        config.kickChannel = msg.kickChannel.trim();
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

  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
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
