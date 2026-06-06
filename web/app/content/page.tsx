"use client";

import { TermShell } from "../components/TermShell";
import { ContentBoard } from "../components/ContentBoard";

export default function ContentPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Content</h1>
        <p className="mb-page-sub">The latest from the show — posts, clips &amp; recent streams</p>
      </section>
      <ContentBoard />
    </TermShell>
  );
}
