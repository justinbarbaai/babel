"use client";

import { SiteNav, SiteFooter } from "../components/SiteShell";
import { Ticker } from "../components/Ticker";

export default function NewsPage() {
  return (
    <div className="mb-site">
      <SiteNav />
      <Ticker />
      <main className="mb-main">
        <section className="mb-section-head">
          <h1 className="mb-page-title">News</h1>
          <p className="mb-page-sub">The wire — crypto &amp; market headlines</p>
        </section>
        <div className="mb-placeholder">
          <p>The live headline wire lands here next.</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
