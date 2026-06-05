"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatFeed } from "../components/ChatFeed";
import { useHub } from "../lib/useHub";
import { parseOptions, type OverlayOptions } from "../lib/overlay";

export default function OverlayPage() {
  const [options, setOptions] = useState<OverlayOptions | null>(null);

  // Read the link's query params on the client (overlay is client-only so we
  // avoid Suspense boundaries and prerender of dynamic params).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOptions(parseOptions(params));
  }, []);

  // Make the page transparent so OBS/Streamlabs composites it over the scene.
  useEffect(() => {
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

  const pushChannels = useMemo(() => {
    if (!options) return null;
    if (!options.twitch.length && !options.kick.length && !options.xQuery)
      return null;
    return { twitch: options.twitch, kick: options.kick, xQuery: options.xQuery };
  }, [options]);

  const { messages } = useHub({ pushChannels });

  if (!options) return null;

  return (
    <div className="overlay-page">
      <ChatFeed messages={messages} options={options} />
    </div>
  );
}
