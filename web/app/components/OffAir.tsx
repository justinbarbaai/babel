"use client";

import { useEffect, useMemo, useState } from "react";
import { useHub } from "../lib/useHub";
import { SourceLogo } from "./logos";
import { HostSocials } from "./HostSocialCard";
import { MediaPlayer } from "./MediaPlayer";
import type { Media } from "../lib/media";
import { HOSTS, type Stream } from "../lib/showContent";

function twitchVodId(url?: string): string | null {
  const m = (url || "").match(/videos\/(\d+)/);
  return m ? m[1] : null;
}

// Next recurring show time: Thursday 1:00 PM (local). Returns the next future one.
function nextLive(now: number): Date {
  const d = new Date(now);
  const target = new Date(d);
  target.setHours(13, 0, 0, 0);
  // 4 = Thursday
  let add = (4 - target.getDay() + 7) % 7;
  if (add === 0 && target.getTime() <= now) add = 7;
  target.setDate(target.getDate() + add);
  return target;
}

function countdown(toMs: number, now: number): string {
  const s = Math.max(0, Math.floor((toMs - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// The off-air home: a centered replay theater (Banks' latest Twitch VODs) plus
// host channels, a recent-broadcasts rail, a next-live countdown, and a slim
// markets + clips strip. Shown when no host is live.
export function OffAir() {
  const { hubHttpUrl } = useHub();
  const [vods, setVods] = useState<Stream[]>([]);
  const [selected, setSelected] = useState<Stream | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!hubHttpUrl) return;
    let alive = true;
    fetch(`${hubHttpUrl}/content`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const tw: Stream[] = (d.streams || []).filter(
          (s: Stream) => (s as { source?: string }).source !== "kick" && twitchVodId(s.url)
        );
        setVods(tw);
        setSelected((cur) => cur || tw[0] || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hubHttpUrl]);

  // The theater plays the latest broadcast VOD; the Embed API force-plays it
  // (muted) once the player is ready — same trick Twitch uses.
  const heroMedia: Media | null = selected
    ? { kind: "vod", title: selected.title, url: selected.url, source: "twitch" }
    : null;

  const next = useMemo(() => (now ? nextLive(now) : null), [now]);
  const nextLabel = next
    ? `${next.toLocaleDateString(undefined, { weekday: "short" })} ${next.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "";

  return (
    <div className="oa">
      <div className="oa-masthead">
        <span className="oa-mast-kicker">Off Air</span>
        {next && (
          <span className="oa-mast-note">
            Next live · {nextLabel} · {countdown(next.getTime(), now)}
          </span>
        )}
      </div>

      {/* centered theater — latest clip autoplays; rail swaps to a full VOD */}
      <div className="oa-stage">
        {heroMedia ? (
          <div className="oa-player">
            {/* same player engine as the mini-player */}
            <MediaPlayer media={heroMedia} muted />
          </div>
        ) : (
          <div className="oa-player oa-player-empty">
            <span className="muted">Loading the latest broadcast…</span>
          </div>
        )}
        {heroMedia && (
          <div className="oa-stage-cap">
            <div className="oa-stage-meta">
              <span className="oa-stage-badge">{heroMedia.kind === "clip" ? "Highlight" : "Replay"}</span>
              <span className="oa-stage-title">{heroMedia.title}</span>
            </div>
            <a className="oa-stage-go" href={heroMedia.url} target="_blank" rel="noreferrer">
              <SourceLogo source="twitch" size={12} /> Watch on Twitch ↗
            </a>
          </div>
        )}
      </div>

      {/* recent broadcasts rail */}
      {vods.length > 1 && (
        <div className="oa-section">
          <div className="oa-section-head">
            <span className="oa-section-title">Recent Broadcasts</span>
            <span className="oa-section-rule" />
          </div>
          <div className="oa-rail">
            {vods.map((v, i) => {
              const on = selected?.url === v.url;
              return (
                <button
                  key={i}
                  className={`oa-rail-card ${on ? "on" : ""}`}
                  onClick={() => setSelected(v)}
                >
                  <span className="oa-rail-thumb">
                    {v.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumb} alt="" loading="lazy" />
                    ) : (
                      <span className="oa-rail-thumb-ph" />
                    )}
                    {v.duration && <span className="oa-rail-dur">{v.duration}</span>}
                    {on && <span className="oa-rail-now">Now playing</span>}
                  </span>
                  <span className="oa-rail-title">{v.title}</span>
                  <span className="oa-rail-date">
                    {v.date}
                    {v.views ? ` · ${v.views} views` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* host channels */}
      <div className="oa-section">
        <div className="oa-section-head">
          <span className="oa-section-title">The Hosts</span>
          <span className="oa-section-rule" />
        </div>
        <div className="oa-hosts">
          {HOSTS.map((h) => (
            <div key={h.handle} className="oa-host" tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="oa-host-av" src={h.avatar} alt={h.name} loading="lazy" />
              <div className="oa-host-id">
                <span className="oa-host-name">{h.name}</span>
                <span className="oa-host-role">{h.role}</span>
              </div>
              <HostSocials host={h} className="oa-host-links" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
