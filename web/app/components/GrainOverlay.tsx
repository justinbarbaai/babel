"use client";

/**
 * Fine paper / film grain across the whole site — the tactile letterpress
 * texture from the Market Bubble brand. A single fixed layer, pointer-events
 * none, blended over everything. Intensity is tuned per theme in CSS.
 */
export function GrainOverlay() {
  return <div className="grain" aria-hidden="true" />;
}
