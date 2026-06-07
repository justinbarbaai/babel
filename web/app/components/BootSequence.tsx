"use client";

import { useEffect, useState } from "react";

/**
 * Cold-open boot (LETTERPRESS): a paper field, the logotype stamps in, then it
 * lifts to the room — and signals the header logo to "re-stamp" into place as it
 * goes. Cover shows immediately; the press is held until the thread is idle so
 * it paints. Plays on every full page load / refresh (not client-side nav, since
 * this lives in the layout and only remounts on a real load).
 */
export function BootSequence() {
  const [phase, setPhase] = useState<"idle" | "cover" | "play" | "out">("idle");

  useEffect(() => {
    setPhase("cover");
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      setPhase("play");
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const ric = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 650 }) : null;
    const fallback = setTimeout(start, 500);
    return () => {
      clearTimeout(fallback);
      void ric;
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const t1 = setTimeout(() => {
      setPhase("out");
      // re-stamp: cue the header logo to stamp in as the cover lifts
      document.documentElement.classList.add("mb-restamp");
      setTimeout(() => document.documentElement.classList.remove("mb-restamp"), 900);
    }, 1700);
    const t2 = setTimeout(() => {
      setPhase("idle");
    }, 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div
      className={`boot ${phase === "play" ? "play" : ""} ${phase === "out" ? "out" : ""}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mb-logotype.svg" className="boot-lockup" alt="" />
    </div>
  );
}
