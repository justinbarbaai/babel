"use client";

// Minimal client-side Twitch IRC connection used ONLY to send messages as the
// logged-in user. Reading still comes through the hub (anonymous + emotes); a
// sent message reappears in that feed naturally once it's in the channel.
export class TwitchSender {
  private ws: WebSocket | null = null;
  private ready = false;
  private joined = new Set<string>();
  private queue: string[] = [];

  constructor(private token: string, private login: string) {}

  connect() {
    if (this.ws) return;
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    this.ws = ws;
    ws.onopen = () => {
      ws.send(`PASS oauth:${this.token}`);
      ws.send(`NICK ${this.login}`);
      this.ready = true;
      for (const m of this.queue) ws.send(m);
      this.queue = [];
    };
    ws.onmessage = (e) => {
      const data = String(e.data);
      if (data.startsWith("PING")) ws.send(data.replace("PING", "PONG"));
    };
    ws.onclose = () => {
      this.ready = false;
    };
    ws.onerror = () => {};
  }

  private raw(msg: string) {
    if (this.ws && this.ready && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.queue.push(msg);
      this.connect();
    }
  }

  send(channel: string, text: string) {
    const ch = channel.toLowerCase().replace(/^#/, "");
    const body = text.trim();
    if (!ch || !body) return;
    if (!this.joined.has(ch)) {
      this.raw(`JOIN #${ch}`);
      this.joined.add(ch);
    }
    this.raw(`PRIVMSG #${ch} :${body}`);
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.ready = false;
    this.joined.clear();
  }
}
