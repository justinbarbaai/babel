"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "../lib/player";
import { sourceLabel } from "../lib/media";
import { MediaPlayer, mediaEmbeddable } from "./MediaPlayer";

// Centered in-site player for a clip / VOD. Plays on the site instead of
// bouncing to Twitch/Kick; can be minimized into the floating mini-player.
export function VideoModal() {
  const { modal, closeModal, minimize } = usePlayer();
  const [parent, setParent] = useState("");

  useEffect(() => setParent(window.location.hostname), []);
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  if (!modal || typeof document === "undefined") return null;

  const embeddable = mediaEmbeddable(modal);
  const isX = modal.source === "x";
  const label = sourceLabel(modal.source);
  const kindLabel = isX ? "Post" : modal.kind === "clip" ? "Clip" : modal.kind === "vod" ? "Stream" : "Live";

  return createPortal(
    <div className="vm-scrim" onClick={closeModal}>
      <div className="vm" data-x={isX ? "1" : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="vm-head">
          <div className="vm-headl">
            <span className="vm-kicker">
              {modal.channel ? `${modal.channel} · ` : ""}
              {label} {kindLabel}
            </span>
            <h2 className="vm-title">{modal.title}</h2>
          </div>
          <div className="vm-actions">
            <button className="vm-btn" onClick={minimize} title="Pop out to mini player" aria-label="Minimize">
              ⤡
            </button>
            <button className="vm-btn" onClick={closeModal} title="Close" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="vm-body">
          <div className="vm-stage">
            {parent && embeddable ? (
              <MediaPlayer media={modal} muted={false} />
            ) : (
              <div className="vm-noembed">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {modal.thumb && <img src={modal.thumb} alt={modal.title} />}
                <a className="vm-open" href={modal.url} target="_blank" rel="noreferrer">
                  Watch on {label} ↗
                </a>
              </div>
            )}
          </div>

          <aside className="vm-meta">
            {modal.date && (
              <div className="vm-metarow">
                <span className="vm-metalabel">Streamed</span>
                <span className="vm-metaval">{modal.date}</span>
              </div>
            )}
            {modal.duration && (
              <div className="vm-metarow">
                <span className="vm-metalabel">Runtime</span>
                <span className="vm-metaval">{modal.duration}</span>
              </div>
            )}
            {modal.views && (
              <div className="vm-metarow">
                <span className="vm-metalabel">Views</span>
                <span className="vm-metaval">{modal.views}</span>
              </div>
            )}
            {modal.url && (
              <a className="vm-open vm-open-ghost" href={modal.url} target="_blank" rel="noreferrer">
                Open on {label} ↗
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
}
