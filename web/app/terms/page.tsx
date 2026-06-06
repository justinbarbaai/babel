"use client";

import { TermShell } from "../components/TermShell";

export default function TermsPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Terms</h1>
        <p className="mb-page-sub">Terms of Service · last updated June 2026</p>
      </section>

      <div className="legal-prose">
        <h2>1. Acceptance</h2>
        <p>
          Market Bubble is a live entertainment and information product that aggregates
          third-party chat, market data, and news. By using the site you agree to these
          terms. If you do not agree, do not use the site.
        </p>

        <h2>2. No financial advice</h2>
        <p>
          Prediction-market odds, prices, indices, and headlines shown here are sourced
          from third parties (including Polymarket, CoinGecko, alternative.me, and various
          news outlets) and are provided for information and entertainment only. Nothing on
          Market Bubble is financial, investment, legal, or tax advice. Markets are
          volatile; you are solely responsible for your own decisions.
        </p>

        <h2>3. Third-party content</h2>
        <p>
          Chat messages, emotes, streams, and articles originate from Twitch, Kick, X, and
          their users and publishers. We do not author or endorse that content and are not
          responsible for it. Trademarks and logos belong to their respective owners.
        </p>

        <h2>4. Acceptable use</h2>
        <p>
          Do not use the site to break the law, harass others, or attempt to disrupt the
          service. We may remove access at any time.
        </p>

        <h2>5. Disclaimer &amp; liability</h2>
        <p>
          The site is provided &ldquo;as is&rdquo; without warranties of any kind. To the
          fullest extent permitted by law, Market Bubble is not liable for any losses
          arising from your use of the site or reliance on any data shown.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use after a change means
          you accept the revised terms.
        </p>

        <p className="legal-note">
          Questions? Reach us on <a href="https://x.com/MarketBubble" target="_blank" rel="noreferrer">X</a>.
        </p>
      </div>
    </TermShell>
  );
}
