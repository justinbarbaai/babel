"use client";

import type { ReactNode } from "react";
import { PlayerProvider } from "../lib/player";
import { VideoModal } from "./VideoModal";
import { MiniPlayer } from "./MiniPlayer";

// Wraps the whole app so any page can open the in-site modal / mini-player, and
// the mini-player persists across route changes (it lives above the routed tree).
export function PlayerLayer({ children }: { children: ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <VideoModal />
      <MiniPlayer />
    </PlayerProvider>
  );
}
