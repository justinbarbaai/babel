"use client";

import { useState } from "react";
import { StyleControls } from "./StyleControls";
import { buildQuery, type LookOptions, type OverlayOptions } from "../lib/overlay";

// A slide-in drawer for the viewer to style THEIR OWN chat. Changes write to
// per-device prefs and the live chat behind it updates instantly (preview).
// Also exports the viewer's styled chat as a pop-out / OBS overlay URL.
export function ChatCustomizer({
  open,
  onClose,
  look,
  onChange,
  onReset,
  customized,
  overlayOptions,
}: {
  open: boolean;
  onClose: () => void;
  look: LookOptions;
  onChange: (patch: Partial<LookOptions>) => void;
  onReset: () => void;
  customized: boolean;
  overlayOptions: OverlayOptions;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const overlayUrl = origin ? `${origin}/overlay?${buildQuery(overlayOptions)}` : "";
  const readerUrl = origin ? `${origin}/reader?${buildQuery(overlayOptions)}` : "";
  const popReader = () => window.open(readerUrl, "mbreader", "width=440,height=760,resizable=yes");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  return (
    <>
      <div className={`cc-scrim ${open ? "in" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`cc-drawer ${open ? "in" : ""}`} role="dialog" aria-label="Customize your chat" aria-hidden={!open}>
        <div className="cc-head">
          <span className="cc-title">Your Chat</span>
          <button className="cc-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="cc-note">
          Saved on this device — only changes <b>your</b> view, never anyone else's.
        </p>

        <div className="cc-body">
          <StyleControls value={look} onChange={onChange} />

          <button className="cc-popout" onClick={popReader}>
            ↗ Pop out chat into its own window
          </button>

          <div className="cc-overlay">
            <span className="cc-overlay-title">Your overlay</span>
            <p className="cc-overlay-note">
              Your styled chat as a link — pop it out or drop it into OBS as a browser source.
            </p>
            <input className="cc-overlay-url" value={overlayUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="cc-overlay-btns">
              <button className="cc-overlay-copy" onClick={copy}>
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a className="cc-overlay-open" href={overlayUrl} target="_blank" rel="noreferrer">
                Open ↗
              </a>
            </div>
          </div>
        </div>

        <div className="cc-foot">
          {customized ? (
            <button className="cc-reset" onClick={onReset}>
              Reset to show default
            </button>
          ) : (
            <span className="cc-foot-hint">Matching the show's default look</span>
          )}
        </div>
      </aside>
    </>
  );
}
