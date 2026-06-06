"use client";

import { TermShell } from "../components/TermShell";
import { MarketTape } from "../components/MarketTape";
import { PolymarketBoard } from "../components/PolymarketBoard";

export default function MarketPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Market</h1>
        <p className="mb-page-sub">
          The tape — live prices, and the markets where real money is pricing what happens next.
        </p>
      </section>

      <MarketTape />

      <PolymarketBoard />
    </TermShell>
  );
}
