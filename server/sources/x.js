import { EventEmitter } from "node:events";
import { unifiedMessage } from "./constants.js";

const RULES_URL = "https://api.x.com/2/tweets/search/stream/rules";
const STREAM_URL = "https://api.x.com/2/tweets/search/stream";
const RECENT_URL = "https://api.x.com/2/tweets/search/recent";

// X (Twitter) real-time source via the Filtered Stream endpoint. We push a
// single rule built from the configured query/handle, then hold a persistent
// HTTP connection that delivers matching posts in near real-time (~6-7s),
// instead of polling recent-search on an interval. Requires a pay-per-use (or
// higher) bearer token; pay-per-use allows one stream connection.
export class XSource extends EventEmitter {
  constructor(query, { bearerToken } = {}) {
    super();
    this.query = String(query || "").trim();
    this.bearerToken = bearerToken;
    this.connected = false;
    this.stopped = false;
    this.controller = null;
    this.reconnectDelay = 1000;
    this.reconnectTimer = null;
    this.keepAliveTimer = null;
    // Backfill the recent posts once per query so the feed isn't empty on
    // connect; `seen` dedupes a post that also arrives live on the stream.
    this.backfilled = false;
    this.seen = new Set();
  }

  start() {
    this.stopped = false;
    if (!this.bearerToken) {
      this.emit("error", new Error("X_BEARER_TOKEN not set — X source disabled."));
      this.setConnected(false);
      return;
    }
    if (!this.query) {
      this.setConnected(false);
      return;
    }
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearTimers();
    this.abortStream();
    this.setConnected(false);
  }

  setConnected(value) {
    if (this.connected === value) return;
    this.connected = value;
    this.emit("status", { source: "x", connected: value, channel: this.query });
  }

  clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.keepAliveTimer) clearTimeout(this.keepAliveTimer);
    this.reconnectTimer = null;
    this.keepAliveTimer = null;
  }

  abortStream() {
    if (this.controller) {
      try {
        this.controller.abort();
      } catch {}
      this.controller = null;
    }
  }

  async connect() {
    if (this.stopped) return;
    try {
      await this.syncRules();
    } catch (err) {
      this.setConnected(false);
      this.emit("error", err);
      this.scheduleReconnect();
      return;
    }

    // One-time backfill so X shows something immediately (the stream itself
    // only delivers posts published after we connect). Skipped on reconnects.
    if (!this.backfilled) {
      this.backfilled = true;
      await this.backfill().catch(() => {});
      if (this.stopped) return;
    }

    this.openStream();
  }

  async backfill() {
    const params = new URLSearchParams({
      query: buildRule(this.query),
      max_results: "10",
      "tweet.fields": "created_at,author_id,referenced_tweets",
      expansions: "author_id",
      "user.fields": "username",
    });
    const res = await fetch(`${RECENT_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const users = new Map(
      (json?.includes?.users ?? []).map((u) => [u.id, u.username])
    );
    // Recent search returns newest-first; emit oldest-first so it reads naturally.
    for (const tweet of [...(json?.data ?? [])].reverse()) {
      if (!tweet?.text || this.seen.has(tweet.id)) continue;
      if (tweet.referenced_tweets?.length) continue; // skip RT / quote / reply
      this.seen.add(tweet.id);
      const username = users.get(tweet.author_id) ?? "unknown";
      const ts = tweet.created_at ? Date.parse(tweet.created_at) : Date.now();
      this.emit("message", unifiedMessage("x", username, tweet.text, ts, undefined, undefined, this.query));
    }
  }

  // Replace whatever rules exist with one rule derived from the query. The
  // stream is shared per project, so we always reset to exactly our rule.
  async syncRules() {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      "Content-Type": "application/json",
    };

    const listRes = await fetch(RULES_URL, { headers });
    if (!listRes.ok) throw new Error(`X rules list failed (${listRes.status})`);
    const current = await listRes.json();
    const ids = (current?.data ?? []).map((r) => r.id);
    if (ids.length) {
      const delRes = await fetch(RULES_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ delete: { ids } }),
      });
      if (!delRes.ok) throw new Error(`X rules delete failed (${delRes.status})`);
    }

    const value = buildRule(this.query);
    const addRes = await fetch(RULES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ add: [{ value, tag: "marketbubble" }] }),
    });
    if (!addRes.ok) {
      const body = await addRes.text().catch(() => "");
      throw new Error(`X rules add failed (${addRes.status}) ${body}`.trim());
    }
  }

  async openStream() {
    const params = new URLSearchParams({
      "tweet.fields": "created_at,author_id,referenced_tweets",
      expansions: "author_id",
      "user.fields": "username",
    });

    this.controller = new AbortController();
    let res;
    try {
      res = await fetch(`${STREAM_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
        signal: this.controller.signal,
      });
    } catch (err) {
      if (!this.stopped) {
        this.setConnected(false);
        this.emit("error", err);
        this.scheduleReconnect();
      }
      return;
    }

    if (res.status === 429) {
      // Pay-per-use allows one connection; a stale connection takes time to
      // release server-side, so wait well past that before retrying.
      this.setConnected(false);
      this.emit("error", new Error("X stream at connection limit (429); backing off."));
      this.scheduleReconnect(30000);
      return;
    }
    if (!res.ok || !res.body) {
      this.setConnected(false);
      this.emit("error", new Error(`X stream error ${res.status}`));
      this.scheduleReconnect();
      return;
    }

    this.setConnected(true);
    this.reconnectDelay = 1000;
    this.armKeepAlive();

    // Newline-delimited JSON. Blank keep-alive lines arrive every ~20s; if the
    // stream goes silent past that, armKeepAlive aborts and we reconnect.
    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!this.stopped) {
        const { done, value } = await reader.read();
        if (done) break;
        this.armKeepAlive();
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) this.handleLine(line);
        }
      }
    } catch (err) {
      if (!this.stopped) this.emit("error", err);
    }

    this.clearTimers();
    this.setConnected(false);
    this.scheduleReconnect();
  }

  handleLine(line) {
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      return;
    }
    const tweet = frame?.data;
    if (!tweet?.text || this.seen.has(tweet.id)) return;
    if (tweet.referenced_tweets?.length) return; // skip RT / quote / reply
    if (tweet.id) {
      this.seen.add(tweet.id);
      if (this.seen.size > 200) this.seen = new Set([...this.seen].slice(-100));
    }
    const users = new Map(
      (frame?.includes?.users ?? []).map((u) => [u.id, u.username])
    );
    const username = users.get(tweet.author_id) ?? "unknown";
    const ts = tweet.created_at ? Date.parse(tweet.created_at) : Date.now();
    this.emit("message", unifiedMessage("x", username, tweet.text, ts));
  }

  armKeepAlive() {
    if (this.keepAliveTimer) clearTimeout(this.keepAliveTimer);
    // The stream emits a keep-alive every 20s; treat 25s of silence as dead.
    this.keepAliveTimer = setTimeout(() => this.abortStream(), 25000);
  }

  scheduleReconnect(floor = 0) {
    if (this.stopped) return;
    this.clearTimers();
    const delay = Math.max(this.reconnectDelay, floor);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
    this.reconnectDelay = Math.min(delay * 2, 60000);
  }
}

// Build a stream rule that only matches the host(s') OWN original tweets — no
// retweets, quote-tweets, replies, or mentions of them. A bare "@handle" becomes
// from:handle; a multi-account query (from:a OR from:b) is wrapped as-is.
function buildRule(query) {
  const handle = query.match(/^@?(\w{1,15})$/);
  const base = handle ? `from:${handle[1]}` : query;
  return `(${base}) -is:retweet -is:quote -is:reply`;
}
