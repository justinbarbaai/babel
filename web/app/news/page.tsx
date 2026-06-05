"use client";

import { TermShell } from "../components/TermShell";
import { NewsWire } from "../components/NewsWire";

export default function NewsPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">News</h1>
        <p className="mb-page-sub">The wire — crypto &amp; trading headlines, updated live</p>
      </section>

      <NewsWire />
    </TermShell>
  );
}
