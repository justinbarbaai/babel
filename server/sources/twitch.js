import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { unifiedMessage } from "./constants.js";
import { twitchFragments } from "./emotes.js";

const TWITCH_IRC_WS = "wss://irc-ws.chat.twitch.tv:443";

// Anonymous read-only Twitch chat over IRC-on-WebSocket.
// We connect as an anonymous `justinfanNNNN` user (no auth, no cost) and parse
// PRIVMSG lines into the unified format. Emits "message" and "status" events.
export class TwitchSource extends EventEmitter {
  constructor(channel, { emotes, badges } = {}) {
    super();
    this.channel = sanitizeChannel(channel);
    this.emotes = emotes || null;
    this.badges = badges || null;
    this.emoteMap = new Map(); // 3rd-party name -> url, filled async once room-id is known
    this.roomId = null;
    this.ws = null;
    this.connected = false;
    this.reconnectDelay = 1000;
    this.stopped = false;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        // Closing a still-CONNECTING socket emits an async 'error' event; a
        // no-op handler keeps that from crashing the process.
        this.ws.on("error", () => {});
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setConnected(false);
  }

  setConnected(value) {
    if (this.connected === value) return;
    this.connected = value;
    this.emit("status", { source: "twitch", connected: value, channel: this.channel });
  }

  clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  connect() {
    if (this.stopped) return;
    if (!this.channel) {
      this.setConnected(false);
      return;
    }

    const ws = new WebSocket(TWITCH_IRC_WS);
    this.ws = ws;

    ws.on("open", () => {
      // Request IRCv3 tags so PRIVMSG carries the `emotes` and `room-id` tags
      // (without this CAP, Twitch sends none and native emotes are invisible).
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      // Anonymous login. A random justinfan nick requires no password.
      const nick = `justinfan${Math.floor(Math.random() * 90000) + 10000}`;
      ws.send(`NICK ${nick}`);
      ws.send(`JOIN #${this.channel}`);
      this.reconnectDelay = 1000;
      this.setConnected(true);
    });

    ws.on("message", (raw) => this.handleData(raw.toString()));

    ws.on("close", () => {
      this.setConnected(false);
      this.scheduleReconnect();
    });

    ws.on("error", () => {
      // 'close' fires after 'error'; reconnect is handled there.
      this.setConnected(false);
    });
  }

  handleData(data) {
    const lines = data.split("\r\n").filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("PING")) {
        // Keep the connection alive.
        this.ws?.send(line.replace("PING", "PONG"));
        continue;
      }
      const parsed = parseIrc(line);
      if (parsed && parsed.command === "PRIVMSG") {
        const roomId = parsed.tags["room-id"];
        if (roomId && roomId !== this.roomId) {
          this.roomId = roomId;
          this.loadEmotes(roomId);
          this.badges?.ensure(roomId);
        }
        const fragments = twitchFragments(parsed.text, parsed.tags["emotes"], this.emoteMap);
        const display = (parsed.tags["display-name"] || "").trim() || parsed.username;
        this.emit(
          "message",
          unifiedMessage(
            "twitch",
            display,
            parsed.text,
            Date.now(),
            fragments,
            parsed.tags["color"] || null,
            this.channel,
            buildTwitchBadges(parsed.tags["badges"], this.roomId, this.badges),
            parsed.tags["user-id"] || null
          )
        );
      }
    }
  }

  loadEmotes(roomId) {
    if (!this.emotes) return;
    this.emotes
      .channelMap("twitch", roomId)
      .then((map) => {
        this.emoteMap = map;
      })
      .catch(() => {});
  }

  scheduleReconnect() {
    if (this.stopped) return;
    this.clearTimers();
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}

function sanitizeChannel(channel) {
  return String(channel || "").trim().toLowerCase().replace(/^#/, "");
}

// IRCv3 `badges` tag → normalized role list, e.g. "moderator/1,subscriber/12"
// → ["mod","sub"]. Only roles we render are kept; order is preserved.
const TWITCH_BADGE_MAP = {
  broadcaster: "broadcaster",
  moderator: "mod",
  vip: "vip",
  subscriber: "sub",
  founder: "founder",
  staff: "staff",
  admin: "staff",
  global_mod: "mod",
  partner: "verified",
  artist: "artist",
};
function titleCase(s) {
  return String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build badge objects {type,title,img} from the IRC `badges` tag. `type` is our
// normalized role (for chip fallback/styling); `img` is the real Twitch badge
// image when the resolver has the set loaded, else null (client renders a chip).
function buildTwitchBadges(raw, roomId, resolver) {
  if (!raw) return null;
  const out = [];
  for (const part of String(raw).split(",")) {
    const [setId, version] = part.split("/");
    if (!setId) continue;
    const hit = resolver ? resolver.lookup(roomId, setId, version) : null;
    out.push({
      type: TWITCH_BADGE_MAP[setId] || setId,
      title: hit?.title || titleCase(setId),
      img: hit?.img || null,
    });
  }
  return out.length ? out : null;
}

// Minimal IRC line parser. Handles optional IRCv3 tags, the prefix, command,
// params, and trailing message. We only care about PRIVMSG for chat text.
function parseIrc(line) {
  let rest = line;
  const tags = {};

  if (rest.startsWith("@")) {
    const space = rest.indexOf(" ");
    const tagStr = rest.slice(1, space);
    rest = rest.slice(space + 1);
    for (const kv of tagStr.split(";")) {
      const eq = kv.indexOf("=");
      if (eq === -1) tags[kv] = "";
      else tags[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
  }

  let username = null;
  if (rest.startsWith(":")) {
    const space = rest.indexOf(" ");
    const prefix = rest.slice(1, space);
    username = prefix.split("!")[0];
    rest = rest.slice(space + 1);
  }

  const trailingIdx = rest.indexOf(" :");
  let trailing = null;
  let head = rest;
  if (trailingIdx !== -1) {
    head = rest.slice(0, trailingIdx);
    trailing = rest.slice(trailingIdx + 2);
  }

  const parts = head.split(" ");
  const command = parts[0];

  return { command, username, text: trailing ?? "", tags };
}
