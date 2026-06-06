"use client";

import { GrainOverlay } from "./GrainOverlay";
import { MagneticFX } from "./MagneticFX";
import { BootSequence } from "./BootSequence";

/**
 * Site-wide FX, mounted once in the root layout. Kept intentionally minimal —
 * the premium feel comes from restraint:
 *  - paper grain over everything
 *  - magnetic interactive elements (subtle pull toward the cursor)
 *  - cold-open boot sequence (first visit per session)
 * Route changes use a clean content fade (see `pageIn` in globals.css); the
 * native cursor is left alone.
 */
export function SiteFX() {
  return (
    <>
      <GrainOverlay />
      <MagneticFX />
      <BootSequence />
    </>
  );
}
