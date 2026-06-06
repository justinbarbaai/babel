"use client";

import { useEffect, useState } from "react";
import { SourceLogo } from "./logos";
import { MBMark } from "./brand";
import { useHub } from "../lib/useHub";
import { TWEETS, CLIPS, STREAMS, HOSTS, X_PROFILE, type Clip, type Stream } from "../lib/showContent";

// A thumbnail frame: renders the real image when a URL is provided, otherwise a
// branded video-frame placeholder (so every card reads as media either way).
function Thumb({
  src,
  ratio = "16 / 9",
  duration,
}: {
  src?: string;
  ratio?: string;
  duration?: string;
}) {
  return (
    <span className="cnt-thumb" style={{ aspectRatio: ratio }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cnt-thumb-img" src={src} alt="" loading="lazy" />
      ) : (
        <span className="cnt-thumb-ph" aria-hidden="true">
          <MBMark size={28} />
        </span>
      )}
      <span className="cnt-thumb-play" aria-hidden="true">
        ▶
      </span>
      {duration && <span className="cnt-thumb-dur">{duration}</span>}
    </span>
  );
}

function Section({ title, count }: { title: string; count?: string }) {
  return (
    <div className="cnt-section">
      <span className="cnt-section-kicker">{title}</span>
      <span className="cnt-section-rule" />
      {count && <span className="cnt-section-count">{count}</span>}
    </div>
  );
}

// The /content "Dispatch" — an editorial layout: masthead, a lead story, then
// sectioned Clips / On X / Broadcasts.
export function ContentBoard() {
  const { hubHttpUrl } = useHub();
  // Live clips + VODs from the hub (Twitch Helix); fall back to curated data.
  const [live, setLive] = useState<{ clips?: Clip[]; streams?: Stream[] } | null>(null);
  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    const load = () =>
      fetch(`${hubHttpUrl}/content`)
        .then((r) => r.json())
        .then((d) => alive && setLive(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 120000); // refresh every 2 min
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [hubHttpUrl]);

  const allClips = live?.clips?.length ? live.clips : CLIPS;
  const allStreams = live?.streams?.length ? live.streams : STREAMS;
  const lead = allClips[0];
  const clips = allClips.slice(1);

  return (
    <div className="cnt-mag">
      {/* masthead */}
      <div className="cnt-masthead">
        <span className="cnt-mast-kicker">The Bubble Dispatch</span>
        <a className="cnt-mast-x" href={X_PROFILE} target="_blank" rel="noreferrer">
          <SourceLogo source="x" size={12} /> @MarketBubble ↗
        </a>
      </div>

      {/* hosts */}
      <div className="cnt-hosts">
        {HOSTS.map((h) => (
          <a key={h.handle} className="cnt-host" href={h.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cnt-host-av" src={h.avatar} alt={h.name} loading="lazy" />
            <span className="cnt-host-id">
              <span className="cnt-host-name">{h.name}</span>
              <span className="cnt-host-handle">@{h.handle}</span>
            </span>
            <span className="cnt-host-role">{h.role}</span>
            <span className="cnt-host-follow">
              <SourceLogo source="x" size={12} /> Follow ↗
            </span>
          </a>
        ))}
      </div>

      {/* lead story */}
      {lead && (
        <a className="cnt-lead" href={lead.url || X_PROFILE} rel="noreferrer">
          <Thumb src={lead.thumb} ratio="16 / 9" />
          <div className="cnt-lead-body">
            <span className="cnt-lead-kicker">Latest clip</span>
            <h2 className="cnt-lead-title">{lead.title}</h2>
            <span className="cnt-lead-meta">{lead.date} · Watch ↗</span>
          </div>
        </a>
      )}

      {/* clips */}
      <Section title="Clips" count={`${allClips.length} media`} />
      <div className="cnt-strip">
        {clips.map((c, i) => (
          <a key={i} className="cnt-strip-card" href={c.url || "#"} rel="noreferrer">
            <Thumb src={c.thumb} ratio="16 / 9" />
            <span className="cnt-strip-title">{c.title}</span>
            <span className="cnt-strip-date">{c.date}</span>
          </a>
        ))}
      </div>

      {/* on X */}
      <Section title="On X" count={`${TWEETS.length} posts`} />
      <div className="cnt-x-grid">
        {TWEETS.map((t, i) => (
          <a
            key={i}
            className="cnt-xcard"
            href={t.url || X_PROFILE}
            target="_blank"
            rel="noreferrer"
          >
            <Thumb src={t.thumb} ratio="16 / 9" />
            <span className="cnt-xcard-text">{t.text}</span>
            <span className="cnt-xcard-foot">
              <SourceLogo source="x" size={11} />
              <span className="cnt-xcard-handle">{t.handle}</span>
              {t.retweet && <span className="cnt-xcard-rt">RT</span>}
              <span className="cnt-xcard-date">{t.date}</span>
            </span>
          </a>
        ))}
      </div>

      {/* broadcasts */}
      <Section title="Recent Broadcasts" count="Twitch" />
      <div className="cnt-strip cnt-strip-streams">
        {allStreams.map((s, i) => (
          <a key={i} className="cnt-strip-card" href={s.url || "#"} rel="noreferrer">
            <Thumb src={s.thumb} ratio="16 / 9" duration={s.duration} />
            <span className="cnt-strip-title">{s.title}</span>
            <span className="cnt-strip-date">
              {s.date} · {s.views} views
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
