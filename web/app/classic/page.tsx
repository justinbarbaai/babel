"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { captureKickSessionFromUrl } from "../lib/kickAuth";
import "./mac/mac.css";

// The Macintosh experience is browser-only (WebAudio, canvas, localStorage,
// window listeners throughout) — render it entirely on the client.
const MacApp = dynamic(() => import("./mac/MacApp").then((m) => m.MacApp), {
  ssr: false,
  loading: () => null,
});

export default function ClassicPage() {
  // Kick OAuth returns the viewer here with #kick_session=… — store it so the
  // site inside the theater (same origin) is signed in.
  useEffect(() => {
    captureKickSessionFromUrl();
  }, []);
  return <MacApp />;
}
