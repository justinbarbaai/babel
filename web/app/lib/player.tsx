"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Media } from "./media";

type PlayerCtx = {
  modal: Media | null; // media open in the big modal
  mini: Media | null; // media in the floating mini-player
  miniCollapsed: boolean;
  play: (m: Media) => void; // open in the modal
  closeModal: () => void;
  minimize: () => void; // move the modal media into the mini-player (keeps playing)
  openMini: (m: Media) => void; // show directly in the mini-player
  closeMini: () => void;
  toggleMiniSize: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Media | null>(null);
  const [mini, setMini] = useState<Media | null>(null);
  const [miniCollapsed, setMiniCollapsed] = useState(false);

  const play = useCallback((m: Media) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);
  const minimize = useCallback(() => {
    setModal((m) => {
      if (m) {
        setMini(m);
        setMiniCollapsed(false);
      }
      return null;
    });
  }, []);
  const openMini = useCallback((m: Media) => {
    setMini(m);
    setMiniCollapsed(false);
  }, []);
  const closeMini = useCallback(() => {
    try {
      sessionStorage.setItem("mb.miniDismissed", "1");
    } catch {}
    setMini(null);
  }, []);
  const toggleMiniSize = useCallback(() => setMiniCollapsed((v) => !v), []);

  return (
    <Ctx.Provider
      value={{ modal, mini, miniCollapsed, play, closeModal, minimize, openMini, closeMini, toggleMiniSize }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePlayer(): PlayerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer must be used within <PlayerProvider>");
  return c;
}
