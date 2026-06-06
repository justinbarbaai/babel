"use client";

import { TermShell } from "../components/TermShell";

export default function PrivacyPage() {
  return (
    <TermShell>
      <section className="mb-section-head">
        <h1 className="mb-page-title">Privacy</h1>
        <p className="mb-page-sub">Privacy Policy · last updated June 2026</p>
      </section>

      <div className="legal-prose">
        <h2>1. The short version</h2>
        <p>
          Market Bubble is built to need as little of your data as possible. We do not sell
          your data, and most of the site works without any account at all.
        </p>

        <h2>2. What we store</h2>
        <p>
          Look-and-feel preferences (such as your theme choice and chat styling) are saved
          locally in your browser. If you log in with Twitch to chat, the access token is
          kept in your browser and used only to send messages on your behalf — it is never
          sold or shared.
        </p>

        <h2>3. Third-party data</h2>
        <p>
          Live data is fetched from third parties — Polymarket, CoinGecko, alternative.me,
          and news publishers — and from streaming platforms (Twitch, Kick, X). Their own
          privacy policies govern any data they collect. Server-side API keys stay on our
          server and are never exposed to your browser.
        </p>

        <h2>4. Cookies &amp; tracking</h2>
        <p>
          We use local browser storage for preferences. We do not run third-party
          advertising trackers.
        </p>

        <h2>5. Your choices</h2>
        <p>
          You can clear your browser&rsquo;s local storage at any time to remove saved
          preferences and any login token.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update this policy as the product evolves. The &ldquo;last updated&rdquo;
          date above always reflects the current version.
        </p>

        <p className="legal-note">
          Questions? Reach us on <a href="https://x.com/MarketBubble" target="_blank" rel="noreferrer">X</a>.
        </p>
      </div>
    </TermShell>
  );
}
