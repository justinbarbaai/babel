"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "../lib/useHub";
import type { OverlayOptions } from "../lib/overlay";
import { FONT_STACKS } from "../lib/overlay";
import {
  SourceLogo,
  SOURCE_LABELS,
  type SourceKey,
} from "./logos";

function channelFor(source: SourceKey, options: OverlayOptions): string {
  if (source === "twitch") return options.twitch;
  if (source === "kick") return options.kick;
  return options.xQuery;
}

function nameColorFor(m: ChatMessage, mode: OverlayOptions["nameColor"]): string {
  if (mode === "white") return "#ffffff";
  if (mode === "platform") return m.color;
  // "chatter": the user's real platform color, falling back to platform tint.
  return m.userColor || m.color;
}

export function ChatFeed({
  messages,
  options,
  placeholder,
}: {
  messages: ChatMessage[];
  options: OverlayOptions;
  placeholder?: React.ReactNode;
}) {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  useEffect(() => {
    if (atBottomRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const shown = messages.slice(-options.max);

  return (
    <div
      className="cf-root"
      data-bg={options.bg}
      data-size={options.size}
      data-shadow={options.shadow ? "1" : "0"}
      style={{ fontFamily: FONT_STACKS[options.font] }}
    >
      <div className="cf-feed" ref={feedRef} onScroll={onScroll}>
        {shown.length === 0 && placeholder ? (
          <div className="cf-empty">{placeholder}</div>
        ) : (
          shown.map((m) => (
            <Row
              key={m.id}
              m={m}
              badge={options.badge}
              channel={channelFor(m.source, options)}
              nameColor={nameColorFor(m, options.nameColor)}
              accountColor={options.accountColor}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Row({
  m,
  badge,
  channel,
  nameColor,
  accountColor,
}: {
  m: ChatMessage;
  badge: OverlayOptions["badge"];
  channel: string;
  nameColor: string;
  accountColor: OverlayOptions["accountColor"];
}) {
  return (
    <div className="cf-row">
      {badge !== "dot" && badge !== "text" ? (
        <span
          className="cf-badge"
          data-style={badge}
          data-source={m.source}
          style={{ ["--src" as any]: m.color }}
        >
          <SourceLogo source={m.source} size={14} />
          {badge === "full" && (
            <span className="cf-badge-label">{SOURCE_LABELS[m.source]}</span>
          )}
          {badge === "channel" && (
            <span
              className="cf-badge-label"
              style={accountColor === "white" ? { color: "#ffffff" } : undefined}
            >
              {channel || SOURCE_LABELS[m.source]}
            </span>
          )}
        </span>
      ) : badge === "text" ? (
        <span
          className="cf-badge cf-badge-textonly"
          data-source={m.source}
          style={{ ["--src" as any]: m.color }}
        >
          {SOURCE_LABELS[m.source]}
        </span>
      ) : (
        <span className="cf-dot" style={{ background: m.color }} />
      )}

      <span className="cf-user" style={{ color: nameColor }}>
        {m.username}
      </span>
      <span className="cf-text">
        {m.fragments && m.fragments.length
          ? m.fragments.map((f, i) =>
              f.type === "emote" ? (
                <img
                  key={i}
                  className="cf-emote"
                  src={f.url}
                  alt={f.name}
                  title={f.name}
                  loading="lazy"
                />
              ) : (
                <span key={i}>{f.text}</span>
              )
            )
          : m.text}
      </span>
    </div>
  );
}
