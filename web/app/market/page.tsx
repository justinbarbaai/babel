"use client";

import { TermShell } from "../components/TermShell";
import { FearGreed } from "../components/FearGreed";
import { PolymarketBoard } from "../components/PolymarketBoard";

export default function MarketPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Market</h1>
        <p className="mb-page-sub">Polymarket odds &amp; the crypto fear / greed index</p>
      </section>

      <div className="mkt-top">
        <FearGreed />
        <div className="mkt-top-note">
          <h2 className="mkt-note-title">Read the room.</h2>
          <p>
            The index distills volatility, momentum, volume and social signal into a single
            0–100 score — <b>extreme fear</b> on the left, <b>extreme greed</b> on the right.
            Below, the markets where real money is actually pricing what happens next.
          </p>
        </div>
      </div>

      <PolymarketBoard />
    </TermShell>
  );
}
