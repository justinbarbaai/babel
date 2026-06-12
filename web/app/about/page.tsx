"use client";

import { TermShell } from "../components/TermShell";

// The colophon — a newspaper's masthead page. Who makes the show, when it runs,
// and two honest sentences about the machine underneath.
export default function AboutPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Colophon</h1>
        <p className="mb-page-sub">Market Bubble — the paper of record for the show.</p>
      </section>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 0 64px" }}>
        <ColRow k="The show">
          FaZe Banks &amp; Ansem, live every <b>Thursday 1:00 PM PST</b> — markets, attention, and
          AI, broadcast simultaneously to Twitch, Kick and X.
        </ColRow>
        <ColRow k="The room">
          Every platform&apos;s chat lands here, in one feed, each message marked by the broadcast
          it came from. One audience number counts all of it.
        </ColRow>
        <ColRow k="The machine">
          Twitch and Kick connect natively. X live chat has no API — none — so we built a reader
          that watches the broadcast and reads the chat off the screen in real time, the way a
          person would. As far as we know, it&apos;s the only one.
        </ColRow>
        <ColRow k="The press">
          Set in Playfair Display &amp; IBM Plex Mono on after-hours newsprint. Live markets by
          Polymarket. Printed continuously since March 2026.
        </ColRow>
      </div>
    </TermShell>
  );
}

function ColRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 18,
        padding: "22px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--muted)",
          paddingTop: 4,
        }}
      >
        {k}
      </span>
      <p style={{ margin: 0, lineHeight: 1.65, fontSize: 15.5 }}>{children}</p>
    </div>
  );
}
