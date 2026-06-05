"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceKey } from "../components/logos";
import type { OverlayOptions } from "./overlay";

export type LiveStyle = Partial<OverlayOptions>;

export type MessageFragment =
  | { type: "text"; text: string }
  | { type: "emote"; name: string; url: string };

export interface ChatMessage {
  id: string;
  source: SourceKey;
  username: string;
  text: string;
  timestamp: number;
  color: string;
  userColor?: string | null;
  channel?: string | null;
  fragments?: MessageFragment[] | null;
}

export interface SourceStatus {
  connected: boolean;
  channel: string;
}

export interface Channels {
  twitch: string[];
  kick: string[];
  xQuery: string;
}

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "ws://localhost:8080";
const MAX_BUFFER = 500;

type UseHubArgs = {
  // If set, the hub is told to follow these channels on every (re)connect.
  // Used by the overlay so the link is self-contained.
  pushChannels?: Channels | null;
  // Private subscription: this connection gets its own dedicated sources and
  // does NOT receive the shared/global feed. Used by the pop-out reader so it
  // can watch a separate set of channels from the overlay.
  privateScope?: boolean;
};

export function useHub({ pushChannels = null, privateScope = false }: UseHubArgs = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statuses, setStatuses] = useState<Record<SourceKey, SourceStatus>>({
    twitch: { connected: false, channel: "" },
    kick: { connected: false, channel: "" },
    x: { connected: false, channel: "" },
  });
  const [hubConnected, setHubConnected] = useState(false);
  const [xEnabled, setXEnabled] = useState(true);
  const [serverChannels, setServerChannels] = useState<Channels | null>(null);
  const [liveStyle, setLiveStyle] = useState<LiveStyle | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(1000);
  const pushRef = useRef<Channels | null>(pushChannels);
  pushRef.current = pushChannels;

  const sendChannels = useCallback((channels: Channels, xToken?: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "config",
        ...(privateScope ? { scope: "private" } : {}),
        twitchChannels: channels.twitch,
        kickChannels: channels.kick,
        xQuery: channels.xQuery.trim(),
        // Only sent from the control panel (never the overlay link).
        ...(xToken && xToken.trim() ? { xToken: xToken.trim() } : {}),
      })
    );
  }, [privateScope]);

  const connect = useCallback(() => {
    // Tear down any existing socket first so we never run two in parallel —
    // React strict-mode double-mount and reconnect races would otherwise leave
    // multiple live sockets, each delivering every message (duplicate chats).
    const existing = wsRef.current;
    if (existing) {
      existing.onopen = existing.onmessage = existing.onclose = existing.onerror = null;
      try {
        existing.close();
      } catch {}
      wsRef.current = null;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(HUB_URL);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setHubConnected(true);
      delayRef.current = 1000;
      // Self-contained overlay: tell the hub which channels to follow.
      const push = pushRef.current;
      if (push && (push.twitch.length || push.kick.length || push.xQuery)) {
        sendChannels(push);
      }
    };

    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "message") {
        setMessages((prev) => {
          const next = [
            ...prev,
            {
              id: `${msg.source}-${msg.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
              source: msg.source as SourceKey,
              username: msg.username,
              text: msg.text,
              timestamp: msg.timestamp,
              color: msg.color,
              userColor: msg.userColor ?? null,
              channel: msg.channel ?? null,
              fragments: msg.fragments ?? null,
            },
          ];
          return next.length > MAX_BUFFER ? next.slice(next.length - MAX_BUFFER) : next;
        });
      } else if (msg.type === "status") {
        setStatuses((prev) => ({
          ...prev,
          [msg.source as SourceKey]: {
            connected: msg.connected,
            channel: msg.channel ?? prev[msg.source as SourceKey]?.channel ?? "",
          },
        }));
      } else if (msg.type === "config") {
        if (typeof msg.xEnabled === "boolean") setXEnabled(msg.xEnabled);
        if (msg.config) {
          setServerChannels({
            twitch: msg.config.twitchChannels ?? [],
            kick: msg.config.kickChannels ?? [],
            xQuery: msg.config.xQuery ?? "",
          });
        }
      } else if (msg.type === "style") {
        if (msg.style && typeof msg.style === "object") setLiveStyle(msg.style);
      }
    };

    const onDrop = () => {
      setHubConnected(false);
      setStatuses((prev) => ({
        twitch: { ...prev.twitch, connected: false },
        kick: { ...prev.kick, connected: false },
        x: { ...prev.x, connected: false },
      }));
      scheduleReconnect();
    };

    ws.onclose = onDrop;
    ws.onerror = () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendChannels]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    reconnectRef.current = setTimeout(() => connect(), delayRef.current);
    delayRef.current = Math.min(delayRef.current * 2, 15000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      const ws = wsRef.current;
      if (ws) {
        // Detach handlers (esp. onclose) so teardown doesn't trigger a reconnect.
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        try {
          ws.close();
        } catch {}
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyChannels = useCallback(
    (channels: Channels, xToken?: string) => {
      sendChannels(channels, xToken);
      setMessages([]);
    },
    [sendChannels]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  // Push the current overlay style to the hub so live overlays update without
  // re-copying their link.
  const pushStyle = useCallback((style: LiveStyle) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "style", style }));
  }, []);

  return {
    messages,
    statuses,
    hubConnected,
    xEnabled,
    serverChannels,
    liveStyle,
    pushStyle,
    applyChannels,
    clearMessages,
    hubUrl: HUB_URL,
  };
}
