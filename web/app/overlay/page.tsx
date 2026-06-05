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
  // `overlay-bare` also hides the themed background-blob layer (body::before),
  // which would otherwise show as a glassy colored box over the scene.
  useEffect(() => {
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.classList.add("overlay-bare");
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
      document.body.classList.remove("overlay-bare");
    };
  }, []);

  const pushChannels = useMemo(() => {
    if (!options) return null;
    if (!options.twitch.length && !options.kick.length && !options.xQuery)
      return null;
    return { twitch: options.twitch, kick: options.kick, xQuery: options.xQuery };
  }, [options]);

  const { messages, liveStyle } = useHub({ pushChannels });

  // Live style from the control panel overrides the link's style, so the
  // overlay updates in OBS without re-copying the link. Channels stay from URL.
  const effectiveOptions = useMemo(
    () => (options ? { ...options, ...(liveStyle ?? {}) } : null),
    [options, liveStyle]
  );

  if (!effectiveOptions) return null;

  return (
    <div className="overlay-page">
      <ChatFeed messages={messages} options={effectiveOptions} />
    </div>
  );
}
