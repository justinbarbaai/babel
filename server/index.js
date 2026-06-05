import "dotenv/config";
import http from "node:http";
import { WebSocketServer } from "ws";
import { TwitchSource } from "./sources/twitch.js";
import { KickSource } from "./sources/kick.js";
import { XSource } from "./sources/x.js";
import { SOURCE_COLORS } from "./sources/constants.js";
import { EmoteResolver } from "./sources/emoteResolver.js";
import { TwitchBadgeResolver } from "./sources/twitchBadges.js";
import { fetchViewerSnapshot, fetchXViews, fetchXLive } from "./sources/viewers.js";
import { fetchProfile } from "./sources/profiles.js";
import {
  kickConfigured,
  kickConnected,
  disconnectKick,
  buildKickLoginUrl,
  handleKickCallback,
  kickBan,
  kickSend,
} from "./sources/kickAuth.js";

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
  // Handle whose native X "Live" broadcast we count concurrent viewers for.
  xLiveHandle: process.env.X_LIVE_HANDLE || "",
};

const kickOpts = {
  pusherKey: process.env.KICK_PUSHER_KEY || "32cbd69e4b950bf97679",
  cluster: process.env.KICK_PUSHER_CLUSTER || "us2",
  chatroomId: process.env.KICK_CHATROOM_ID || null,
};
const xOpts = {
  bearerToken: process.env.X_BEARER_TOKEN || "",
};
// Twitch Helix app credentials (optional) — enable live viewer counts. Kick
// counts work without any credentials.
const twitchCreds = {
  clientId: process.env.TWITCH_CLIENT_ID || "",
  clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
};
// Kick OAuth app (optional) — enables connecting a Kick account to send chat and
// moderate (timeout/ban). Reading Kick chat needs none of this.
const kickCreds = {
  clientId: process.env.KICK_CLIENT_ID || "",
  clientSecret: process.env.KICK_CLIENT_SECRET || "",
};
const KICK_REDIRECT_URI =
  process.env.KICK_REDIRECT_URI || `http://localhost:${PORT}/auth/kick/callback`;
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

// Shared emote resolver (7TV + BTTV + FFZ) — caches global + per-channel sets.
const emotes = new EmoteResolver();

// Shared Twitch badge resolver — turns the IRC badges tag into real badge art.
const twitchBadges = new TwitchBadgeResolver(twitchCreds);

// Latest overlay style pushed from the control panel. Remembered so overlays
// (e.g. an OBS browser source) reflect live style changes without re-copying
// the link, and so a freshly-connected overlay gets the current look.
let currentStyle = null;
// Admin-set chat appearance for the public room (separate from the overlay
// style). Broadcast to every visitor; remembered for new connections.
let siteLook = null;

// Latest combined viewer-count snapshot, refreshed on an interval and sent to
// each newly-connected client so the dashboard shows a number immediately.
let lastViewers = null;
let lastXViews = null;
let lastXLive = null;
let viewersTimer = null;
let viewersTick = 0;
const VIEWERS_INTERVAL = 20000;
// X views uses a paid recent-search endpoint, so refresh it far less often than
// the free Twitch/Kick counts — every 6th tick (~2 min).
const X_VIEWS_EVERY = 6;

async function pollViewers() {
  // X views (paid) only every Nth tick, or once at startup if not yet fetched.
  if (xOpts.bearerToken && config.xQuery && (viewersTick % X_VIEWS_EVERY === 0 || lastXViews === null)) {
    try {
      lastXViews = await fetchXViews(config.xQuery, xOpts.bearerToken);
    } catch (err) {
      console.warn("[xviews]", err.message);
    }
  }
  viewersTick++;

  // X live concurrent viewers (free guest-auth path) — poll every tick.
  if (config.xLiveHandle) {
    try {
      lastXLive = await fetchXLive(config.xLiveHandle);
    } catch (err) {
      console.warn("[xlive]", err.message);
    }
  } else {
    lastXLive = null;
  }

  try {
    const snap = await fetchViewerSnapshot(config, twitchCreds);
    snap.x = lastXViews;
    snap.xLive = lastXLive;
    // X live viewers are genuine concurrent viewers, so fold them into the
    // combined total alongside Twitch/Kick.
    if (lastXLive?.live) snap.totals.total += lastXLive.viewers;
    lastViewers = snap;
    broadcast({ type: "viewers", viewers: lastViewers });
  } catch (err) {
    console.warn("[viewers]", err.message);
  }
}

function startViewersPolling() {
  if (viewersTimer) clearInterval(viewersTimer);
  viewersTick = 0;
  lastXViews = null;
  lastXLive = null;
  pollViewers();
  viewersTimer = setInterval(pollViewers, VIEWERS_INTERVAL);
}

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
    const s = new TwitchSource(ch, { emotes, badges: twitchBadges });
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
  // Channels may have changed — refresh viewer counts right away.
  startViewersPolling();
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
    ...build("twitch", twitchChannels, (ch) => new TwitchSource(ch, { emotes, badges: twitchBadges })),
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

function configPayload() {
  return {
    type: "config",
    config,
    colors: SOURCE_COLORS,
    xEnabled: Boolean(xOpts.bearerToken),
    // Whether a Kick OAuth app is configured, and whether an account is linked.
    kickEnabled: kickConfigured(kickCreds),
    kickConnected: kickConnected(),
  };
}

function sendConfig(ws) {
  ws.send(JSON.stringify(configPayload()));
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
  if (currentStyle) {
    ws.send(JSON.stringify({ type: "style", style: currentStyle }));
  }
  if (siteLook) {
    ws.send(JSON.stringify({ type: "siteLook", look: siteLook }));
  }
  if (lastViewers) {
    ws.send(JSON.stringify({ type: "viewers", viewers: lastViewers }));
  }
}

// ---- HTTP + WebSocket server ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Kick OAuth: start the authorize flow (redirect the browser to Kick).
  if (url.pathname === "/auth/kick/login") {
    if (!kickConfigured(kickCreds)) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Kick OAuth is not configured (set KICK_CLIENT_ID/SECRET).");
      return;
    }
    res.writeHead(302, { Location: buildKickLoginUrl(kickCreds, KICK_REDIRECT_URI) });
    res.end();
    return;
  }

  // Kick OAuth: callback — exchange the code, then bounce back to the web app.
  if (url.pathname === "/auth/kick/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    try {
      if (!code || !state) throw new Error("missing code/state");
      await handleKickCallback(kickCreds, KICK_REDIRECT_URI, code, state);
      broadcast(configPayload());
      res.writeHead(302, { Location: `${WEB_ORIGIN}/?kick=connected` });
    } catch (err) {
      console.warn("[kick oauth]", err.message);
      res.writeHead(302, { Location: `${WEB_ORIGIN}/?kick=error` });
    }
    res.end();
    return;
  }

  if (url.pathname === "/health" || url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, status, kick: kickConnected() }));
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
    if (msg.type === "profile" && typeof msg.source === "string" && typeof msg.name === "string") {
      // Lazy hover-card lookup for a single chatter; reply only to this socket.
      const name = msg.name.trim();
      const source = msg.source;
      if (!name) return;
      fetchProfile(source, name, twitchCreds)
        .then((data) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "profile", source, name, data }));
          }
        })
        .catch(() => {});
      return;
    }
    if (msg.type === "kickModerate" && typeof msg.slug === "string" && msg.targetUserId) {
      // Timeout/ban a Kick chatter using the connected Kick account's token.
      const reply = (ok, error) => {
        if (ws.readyState === ws.OPEN)
          ws.send(JSON.stringify({ type: "modResult", platform: "kick", action: msg.action, ok, error: error || null }));
      };
      if (!kickConnected()) return reply(false, "Connect Kick first.");
      const slug = String(msg.slug).toLowerCase();
      const ksrc = sources.kick.find((s) => s.slug === slug);
      const broadcasterUserId = ksrc?.kickUserId;
      if (!broadcasterUserId) return reply(false, `#${slug} isn't being aggregated.`);
      const duration = msg.action === "timeout" ? Number(msg.duration) || 10 : undefined;
      kickBan(kickCreds, { broadcasterUserId, targetUserId: msg.targetUserId, duration })
        .then(() => reply(true))
        .catch((e) => reply(false, e.message));
      return;
    }
    if (msg.type === "kickSend" && typeof msg.slug === "string" && typeof msg.content === "string") {
      const reply = (ok, error) => {
        if (ws.readyState === ws.OPEN)
          ws.send(JSON.stringify({ type: "sendResult", platform: "kick", ok, error: error || null }));
      };
      if (!kickConnected()) return reply(false, "Connect Kick first.");
      const content = msg.content.trim();
      if (!content) return;
      const slug = String(msg.slug).toLowerCase();
      const ksrc = sources.kick.find((s) => s.slug === slug);
      const broadcasterUserId = ksrc?.kickUserId;
      if (!broadcasterUserId) return reply(false, `#${slug} isn't being aggregated.`);
      kickSend(kickCreds, { broadcasterUserId, content })
        .then(() => reply(true))
        .catch((e) => reply(false, e.message));
      return;
    }
    if (msg.type === "kickDisconnect") {
      disconnectKick();
      broadcast(configPayload());
      return;
    }
    if (msg.type === "siteLook" && msg.look && typeof msg.look === "object") {
      // Admin-controlled chat appearance for the public room; applies to all
      // visitors. Remembered so newly-connected clients get the current look.
      siteLook = msg.look;
      broadcast({ type: "siteLook", look: siteLook });
      return;
    }
    if (msg.type === "style" && msg.style && typeof msg.style === "object") {
      // Live overlay style from the control panel — remember it and relay to
      // overlays so they update without re-copying the link.
      currentStyle = msg.style;
      broadcast({ type: "style", style: currentStyle });
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
      if (typeof msg.xLiveHandle === "string")
        config.xLiveHandle = msg.xLiveHandle.trim().replace(/^@/, "");
      // Bring-your-own X token: a user can supply their own bearer token from
      // the control panel to enable X with their own credentials/cost. Kept
      // server-side only (never echoed back or put in the overlay link).
      if (typeof msg.xToken === "string" && msg.xToken.trim())
        xOpts.bearerToken = msg.xToken.trim();
      console.log("Reconfiguring sources:", config);
      startSources();
      broadcast(configPayload());
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
