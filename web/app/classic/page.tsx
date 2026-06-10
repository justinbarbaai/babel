"use client";

import dynamic from "next/dynamic";
import "./mac/mac.css";

// The Macintosh experience is browser-only (WebAudio, canvas, localStorage,
// window listeners throughout) — render it entirely on the client.
const MacApp = dynamic(() => import("./mac/MacApp").then((m) => m.MacApp), {
  ssr: false,
  loading: () => null,
});

export default function ClassicPage() {
  return <MacApp />;
}
