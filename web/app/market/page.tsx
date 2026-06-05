"use client";

import { SiteNav, SiteFooter } from "../components/SiteShell";
import { Ticker } from "../components/Ticker";

export default function MarketPage() {
  return (
    <div className="mb-site">
      <SiteNav />
      <Ticker />
      <main className="mb-main">
        <section className="mb-section-head">
          <h1 className="mb-page-title">Market</h1>
          <p className="mb-page-sub">Polymarket odds &amp; the crypto fear / greed index</p>
        </section>
        <div className="mb-placeholder">
          <p>Live prediction markets land here next.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
