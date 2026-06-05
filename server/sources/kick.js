import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import WebSocket from "ws";
import { unifiedMessage } from "./constants.js";
import { kickFragments } from "./emotes.js";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Kick real-time chat. Two steps:
//   1) Server-side fetch the channel's chatroom id (must be server-side with a
//      browser UA to pass Cloudflare).
//   2) Subscribe to Kick's public Pusher socket on chatrooms.{id}.v2 and parse
//      ChatMessageEvent payloads.
export class KickSource extends EventEmitter {
  constructor(slug, { pusherKey, cluster, chatroomId, emotes } = {}) {
    super();
    this.slug = String(slug || "").trim().toLowerCase();
    this.pusherKey = pusherKey;
    this.cluster = cluster;
    // Optional manual override if Cloudflare blocks the lookup entirely.
    this.fixedChatroomId = chatroomId ? Number(chatroomId) : null;
    this.emotes = emotes || null;
    this.emoteMap = new Map(); // 3rd-party name -> url, filled async once user id is known
    this.kickUserId = null;
    this.ws = null;
    this.chatroomId = null;
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
    this.emit("status", { source: "kick", connected: value, channel: this.slug });
  }

  clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  async resolveChatroomId() {
    if (this.fixedChatroomId) return this.fixedChatroomId;

    // Kick sits behind Cloudflare, which fingerprints TLS + HTTP/2 — Node's
    // fetch/https get a 403 no matter the headers. `curl --http1.1` with a
    // browser UA passes, so we shell out to it first and fall back to fetch.
    const body = await this.fetchChannelBody();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error(`Kick lookup returned non-JSON for "${this.slug}" (likely a Cloudflare block)`);
    }
    const id = json?.chatroom?.id;
    if (!id) throw new Error(`No chatroom id in Kick response for "${this.slug}"`);
    // The streamer's user id keys the channel's 7TV emote set.
    this.kickUserId = json?.user_id ?? json?.user?.id ?? null;
    return id;
  }

  fetchChannelBody() {
    const url = `https://kick.com/api/v2/channels/${this.slug}`;
    return new Promise((resolve, reject) => {
      execFile(
        "curl",
        ["-s", "--http1.1", "--max-time", "10", "-A", BROWSER_UA, "-H", "Accept: application/json", url],
        { maxBuffer: 10 * 1024 * 1024 },
        async (err, stdout) => {
          if (!err && stdout && stdout.trim()) {
            resolve(stdout);
            return;
          }
          // Fallback: plain fetch (works only where Cloudflare isn't enforcing).
          try {
            const res = await fetch(url, {
              headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
            });
            if (!res.ok) {
              reject(new Error(`Kick lookup failed (${res.status}) for "${this.slug}"`));
              return;
            }
            resolve(await res.text());
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  async connect() {
    if (this.stopped) return;
    if (!this.slug) {
      this.setConnected(false);
      return;
    }

    try {
      this.chatroomId = await this.resolveChatroomId();
    } catch (err) {
      this.emit("error", err);
      this.setConnected(false);
      this.scheduleReconnect();
      return;
    }

    if (this.emotes && this.kickUserId) {
      this.emotes
        .channelMap("kick", this.kickUserId)
        .then((map) => {
          this.emoteMap = map;
        })
        .catch(() => {});
    }

    const url =
      `wss://ws-${this.cluster}.pusher.com/app/${this.pusherKey}` +
      `?protocol=7&client=js&version=8.4.0&flash=false`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectDelay = 1000;
      // 'connected' is reported once Pusher confirms the connection below.
    });

    ws.on("message", (raw) => this.handleData(raw.toString()));

    ws.on("close", () => {
      this.setConnected(false);
      this.scheduleReconnect();
    });

    ws.on("error", () => {
      this.setConnected(false);
    });
  }

  subscribe() {
    if (!this.ws || this.chatroomId == null) return;
    this.ws.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: `chatrooms.${this.chatroomId}.v2` },
      })
    );
  }

  handleData(data) {
    let frame;
    try {
      frame = JSON.parse(data);
    } catch {
      return;
    }

    switch (frame.event) {
      case "pusher:connection_established":
        this.setConnected(true);
        this.subscribe();
        return;
      case "pusher:ping":
        this.ws?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        return;
      case "App\\Events\\ChatMessageEvent": {
        let payload;
        try {
          payload =
            typeof frame.data === "string" ? JSON.parse(frame.data) : frame.data;
        } catch {
          return;
        }
        const username = payload?.sender?.username ?? "unknown";
        const text = payload?.content ?? "";
        const ts = payload?.created_at ? Date.parse(payload.created_at) : Date.now();
        const fragments = kickFragments(text, this.emoteMap);
        const userColor = payload?.sender?.identity?.color || null;
        this.emit("message", unifiedMessage("kick", username, text, ts, fragments, userColor, this.slug));
        return;
      }
      default:
        return;
    }
  }

  scheduleReconnect() {
    if (this.stopped) return;
    this.clearTimers();
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
