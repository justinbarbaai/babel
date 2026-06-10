"use client";

import React from "react";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — RUG SWEEPER
// Minesweeper, except the mines are rugs. 9×9, ten rugs. Left-click clears,
// right-click plants a flag. Clear the board before you step on one.
// Best time persists.
// ============================================================================

function SweeperApp() {
  const SIZE = 9, RUGS = 10;
  const [grid, setGrid] = React.useState(null); // null until first click seeds
  const [open, setOpen] = React.useState(() => new Set());
  const [flags, setFlags] = React.useState(() => new Set());
  const [state, setState] = React.useState("fresh"); // fresh | run | dead | won
  const [time, setTime] = React.useState(0);
  const [best, setBest] = React.useState(() => {
    try { return parseInt(localStorage.getItem("mbmac.sweep.best") || "0", 10); } catch (e) { return 0; }
  });

  React.useEffect(() => {
    if (state !== "run") return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [state]);

  const idx = (r, c) => r * SIZE + c;
  const neighbors = (r, c) => {
    const out = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
      }
    return out;
  };

  // seed after first click so square one is always safe
  const seed = (sr, sc) => {
    const rugs = new Set();
    while (rugs.size < RUGS) {
      const p = Math.floor(Math.random() * SIZE * SIZE);
      if (p !== idx(sr, sc)) rugs.add(p);
    }
    const g = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const rug = rugs.has(idx(r, c));
        const n = neighbors(r, c).filter(([nr, nc]) => rugs.has(idx(nr, nc))).length;
        g.push({ rug, n });
      }
    return g;
  };

  const flood = (g, startR, startC, opened) => {
    const stack = [[startR, startC]];
    while (stack.length) {
      const [r, c] = stack.pop();
      const i = idx(r, c);
      if (opened.has(i)) continue;
      opened.add(i);
      if (g[i].n === 0 && !g[i].rug) neighbors(r, c).forEach(([nr, nc]) => !opened.has(idx(nr, nc)) && stack.push([nr, nc]));
    }
  };

  const reveal = (r, c) => {
    if (state === "dead" || state === "won") return;
    const i = idx(r, c);
    if (flags.has(i) || open.has(i)) return;
    let g = grid;
    if (!g) {
      g = seed(r, c);
      setGrid(g);
      setState("run");
      setTime(0);
    }
    if (g[i].rug) {
      MacSound.error();
      const all = new Set(open);
      g.forEach((cell, j) => cell.rug && all.add(j));
      setOpen(all);
      setState("dead");
      return;
    }
    MacSound.click();
    const opened = new Set(open);
    flood(g, r, c, opened);
    setOpen(opened);
    const safe = SIZE * SIZE - RUGS;
    if (opened.size >= safe) {
      MacSound.trade(true);
      setState("won");
      if (!best || time < best) {
        setBest(time || 1);
        try { localStorage.setItem("mbmac.sweep.best", String(time || 1)); } catch (e) {}
      }
    }
  };

  const flag = (e, r, c) => {
    e.preventDefault();
    if (state === "dead" || state === "won") return;
    const i = idx(r, c);
    if (open.has(i)) return;
    MacSound.keyTap();
    setFlags((f) => {
      const n = new Set(f);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const restart = () => {
    MacSound.open();
    setGrid(null);
    setOpen(new Set());
    setFlags(new Set());
    setState("fresh");
    setTime(0);
  };

  const numColor = ["", "#1652f0", "#2f7d52", "#cc2f1c", "#1c2f8a", "#7a1d18", "#1c7a7a", "#222", "#777"];

  return (
    <div className="sweep">
      <div className="sweep-hud">
        <span className="sweep-lcd">{String(Math.max(0, RUGS - flags.size)).padStart(2, "0")} rugs</span>
        <button className="sweep-face" onClick={restart} title="New game">
          {state === "dead" ? "×_×" : state === "won" ? "$_$" : "•‿•"}
        </button>
        <span className="sweep-lcd">{String(time).padStart(3, "0")}s{best ? ` · best ${best}s` : ""}</span>
      </div>
      <div className="sweep-grid" onContextMenu={(e) => e.preventDefault()}>
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const r = Math.floor(i / SIZE), c = i % SIZE;
          const cell = grid ? grid[i] : null;
          const isOpen = open.has(i);
          const isFlag = flags.has(i);
          return (
            <button
              key={i}
              className={`sweep-cell${isOpen ? " open" : ""}${isOpen && cell && cell.rug ? " rug" : ""}`}
              onClick={() => reveal(r, c)}
              onContextMenu={(e) => flag(e, r, c)}
            >
              {isOpen
                ? cell && cell.rug
                  ? "▩"
                  : cell && cell.n > 0
                    ? <b style={{ color: numColor[cell.n] }}>{cell.n}</b>
                    : ""
                : isFlag
                  ? "⚑"
                  : ""}
            </button>
          );
        })}
        {(state === "dead" || state === "won") && (
          <div className="sweep-over" onClick={restart}>
            <span>{state === "dead" ? "RUGGED." : "SWEPT CLEAN"}</span>
            <span className="sub">{state === "dead" ? "you stepped on it" : `${time || 1}s — not bad`}</span>
            <span className="sub">click to go again</span>
          </div>
        )}
      </div>
      <span className="snake-hint">left-click clears · right-click flags · 10 rugs hide in the floor</span>
    </div>
  );
}


export { SweeperApp };
