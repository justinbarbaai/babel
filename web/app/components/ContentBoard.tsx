"use client";

import { useEffect, useState } from "react";
import { SourceLogo } from "./logos";
import { HostSocials } from "./HostSocialCard";
import { usePlayer } from "../lib/player";
import type { Media } from "../lib/media";
import { MBMark } from "./brand";
import { useHub } from "../lib/useHub";
import { TWEETS, CLIPS, STREAMS, HOSTS, X_PROFILE, type Tweet, type Clip, type Stream } from "../lib/showContent";

// A thumbnail frame: renders the real image when a URL is provided, otherwise a
// branded video-frame placeholder (so every card reads as media either way).
function Thumb({
  src,
  ratio = "16 / 9",
  duration,
  source,
}: {
  src?: string;
  ratio?: string;
  duration?: string;
  source?: "twitch" | "kick";
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
      {source && (
        <span className={`cnt-thumb-src cnt-thumb-src-${source}`} aria-hidden="true">
          <SourceLogo source={source} size={12} />
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
  const { play } = usePlayer();
  // Click a clip/VOD → play it on-site (modal). Falls back to the link (cmd-click).
  const open = (m: Media) => (e: React.MouseEvent) => {
    if (m.url) {
      e.preventDefault();
      play(m);
    }
  };
  // Live clips + VODs from the hub (Twitch Helix); fall back to curated data.
  const [live, setLive] = useState<{ clips?: Clip[]; streams?: Stream[]; tweets?: Tweet[] } | null>(null);
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
  const allTweets = live?.tweets?.length ? live.tweets : TWEETS;
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
          <div key={h.handle} className="cnt-host" tabIndex={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="cnt-host-av" src={h.avatar} alt={h.name} loading="lazy" />
            <span className="cnt-host-id">
              <span className="cnt-host-name">{h.name}</span>
              <span className="cnt-host-handle">@{h.handle}</span>
            </span>
            <span className="cnt-host-role">{h.role}</span>
            <HostSocials host={h} className="cnt-host-socials" />
          </div>
        ))}
      </div>

      {/* lead story */}
      {lead && (
        <a
          className="cnt-lead"
          href={lead.url || X_PROFILE}
          target="_blank"
          rel="noreferrer"
          onClick={open({ kind: "clip", title: lead.title, url: lead.url, source: lead.source, thumb: lead.thumb, date: lead.date })}
        >
          <Thumb src={lead.thumb} ratio="16 / 9" source={lead.source} />
          <div className="cnt-lead-body">
            <span className="cnt-lead-kicker">Latest clip</span>
            <h2 className="cnt-lead-title">{lead.title}</h2>
            <span className="cnt-lead-meta">{lead.date} · Watch ▶</span>
          </div>
        </a>
      )}

      {/* clips */}
      <Section title="Clips" count={`${allClips.length} media`} />
      <div className="cnt-strip">
        {clips.map((c, i) => (
          <a
            key={i}
            className="cnt-strip-card"
            href={c.url || "#"}
            target="_blank"
            rel="noreferrer"
            onClick={open({ kind: "clip", title: c.title, url: c.url, source: c.source, thumb: c.thumb, date: c.date, duration: c.duration })}
          >
            <Thumb src={c.thumb} ratio="16 / 9" duration={c.duration} source={c.source} />
            <span className="cnt-strip-title">{c.title}</span>
            <span className="cnt-strip-date">{c.date}</span>
          </a>
        ))}
      </div>

      {/* on X */}
      <Section title="On X" count={`${allTweets.length} posts`} />
      <div className="cnt-x-grid">
        {allTweets.map((t, i) => (
          <a
            key={i}
            className="cnt-xcard"
            href={t.url || X_PROFILE}
            target="_blank"
            rel="noreferrer"
            onClick={open({
              kind: "clip",
              source: "x",
              title: t.text,
              url: t.url,
              thumb: t.thumb,
              tweet: {
                handle: t.handle,
                name: t.name,
                avatar: t.avatar,
                verified: t.verified,
                text: t.text,
                video: t.video,
                thumb: t.thumb,
                date: t.date,
                likes: t.likes,
                replies: t.replies,
              },
            })}
          >
            {t.thumb && (
              <span className="cnt-xcard-media" style={{ aspectRatio: "16 / 9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cnt-thumb-img" src={t.thumb} alt="" loading="lazy" />
              </span>
            )}
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
          <a
            key={i}
            className="cnt-strip-card"
            href={s.url || "#"}
            target="_blank"
            rel="noreferrer"
            onClick={open({ kind: "vod", title: s.title, url: s.url, source: s.source, thumb: s.thumb, date: s.date, duration: s.duration, views: s.views })}
          >
            <Thumb src={s.thumb} ratio="16 / 9" duration={s.duration} source={s.source} />
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
