"use client";

import { useEffect, useRef, useState } from "react";
import { ChatFeed } from "../components/ChatFeed";
import { useHub } from "../lib/useHub";
import { parseOptions, type OverlayOptions } from "../lib/overlay";
import { SourceLogo } from "../components/logos";
import {
  getAuth,
  getClientId,
  setClientId,
  startLogin,
  handleRedirect,
  clearAuth,
  type TwitchAuth,
} from "../lib/twitchAuth";
import { TwitchSender } from "../lib/twitchSender";

type Tab =
  | { id: "live"; type: "global"; label: string }
  | { id: string; type: "channel"; channel: string; label: string };

// Pop-out reader with tabs: a "Live Preview" tab (the shared overlay feed) plus
// per-channel Twitch tabs you can add and switch between. With a Twitch login,
// channel tabs also let you send messages (client-side, your own account).
export default function ReaderPage() {
  const [options, setOptions] = useState<OverlayOptions | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "live", type: "global", label: "Live Preview" },
  ]);
  const [active, setActive] = useState("live");
  const [newChan, setNewChan] = useState("");

  const [auth, setAuth] = useState<TwitchAuth | null>(null);
  const [clientId, setClientIdState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const senderRef = useRef<TwitchSender | null>(null);

  useEffect(() => {
    setOptions(parseOptions(new URLSearchParams(window.location.search)));
    document.title = "Market Bubble — Chat Reader";
    setClientIdState(getClientId());
    handleRedirect().then((a) => setAuth(a || getAuth()));
  }, []);

  useEffect(() => {
    if (!auth) return;
    const s = new TwitchSender(auth.token, auth.login);
    s.connect();
    senderRef.current = s;
    return () => {
      s.close();
      senderRef.current = null;
    };
  }, [auth]);

  const addChannel = () => {
    const ch = newChan.trim().toLowerCase().replace(/^#/, "");
    if (!ch) return;
    const id = `tw:${ch}`;
    setTabs((prev) =>
      prev.some((t) => t.id === id)
        ? prev
        : [...prev, { id, type: "channel", channel: ch, label: ch }]
    );
    setActive(id);
    setNewChan("");
  };

  const removeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setActive((a) => (a === id ? "live" : a));
  };

  const saveKey = () => {
    const id = keyInput.trim();
    if (!id) return;
    setClientId(id);
    setClientIdState(id);
    setShowKey(false);
  };

  const send = (channel: string, text: string) =>
    senderRef.current?.send(channel, text);

  if (!options) return null;

  return (
    <div className="reader-page">
      <div className="reader-tabs">
        {tabs.map((t) => (
          <span
            key={t.id}
            className={`reader-tab ${active === t.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.type === "channel" && <SourceLogo source="twitch" size={12} />}
            <span>{t.label}</span>
            {t.type === "channel" && (
              <button
                className="reader-tab-x"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(t.id);
                }}
                aria-label="Close tab"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <span className="reader-addtab">
          <input
            value={newChan}
            onChange={(e) => setNewChan(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addChannel();
            }}
            placeholder="add twitch channel"
            spellCheck={false}
          />
          <button onClick={addChannel} aria-label="Add channel tab">
            +
          </button>
        </span>

        <span className="reader-auth">
          {auth ? (
            <>
              <span className="reader-auth-on">● {auth.login}</span>
              <button
                className="reader-auth-btn"
                onClick={() => {
                  clearAuth();
                  setAuth(null);
                }}
              >
                Log out
              </button>
            </>
          ) : clientId ? (
            <button className="reader-auth-btn" onClick={startLogin}>
              Log in with Twitch
            </button>
          ) : showKey ? (
            <span className="reader-key">
              <input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveKey();
                }}
                placeholder="Twitch Client ID"
                spellCheck={false}
              />
              <button onClick={saveKey}>Save</button>
            </span>
          ) : (
            <button className="reader-auth-btn" onClick={() => setShowKey(true)}>
              Enable chatting
            </button>
          )}
        </span>
      </div>

      <div className="reader-body">
        {tabs.map((t) => (
          <ChatTab
            key={t.id}
            tab={t}
            options={options}
            hidden={active !== t.id}
            selfChannel={auth?.login ?? null}
            onSend={send}
          />
        ))}
      </div>
    </div>
  );
}

function ChatTab({
  tab,
  options,
  hidden,
  selfChannel,
  onSend,
}: {
  tab: Tab;
  options: OverlayOptions;
  hidden: boolean;
  selfChannel: string | null;
  onSend: (channel: string, text: string) => void;
}) {
  const args =
    tab.type === "global"
      ? {}
      : {
          pushChannels: { twitch: [tab.channel], kick: [], xQuery: "" },
          privateScope: true,
        };
  const { messages } = useHub(args);
  const [draft, setDraft] = useState("");

  // Channel tabs send to that channel; the Live Preview sends to your own
  // channel. Either way it requires being logged in.
  const sendTarget = tab.type === "channel" ? tab.channel : selfChannel;
  const canChat = !!selfChannel && !!sendTarget;

  const submit = () => {
    if (!sendTarget) return;
    const text = draft.trim();
    if (!text) return;
    onSend(sendTarget, text);
    setDraft("");
  };

  return (
    <div
      className="reader-feed-wrap"
      style={{ display: hidden ? "none" : "flex" }}
    >
      <div className="reader-feed">
        <ChatFeed
          messages={messages}
          options={options}
          placeholder={
            <span>
              {tab.type === "global"
                ? "Waiting for your overlay's chat…"
                : `Waiting for ${tab.label}'s chat…`}
            </span>
          }
        />
      </div>
      {canChat && (
        <div className="reader-composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={
              tab.type === "global"
                ? `Message your chat (#${selfChannel})…`
                : `Message ${tab.label}…`
            }
          />
          <button onClick={submit}>Send</button>
        </div>
      )}
    </div>
  );
}
