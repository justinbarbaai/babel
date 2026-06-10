"use client";

import React from "react";
import { InitialsPrompt } from "./accessories";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — BRICK '87
// Break through the resistance. Paddle + ball + five rows of order-book
// bricks on the green phosphor CRT. Mouse or arrows; best score signed
// arcade-style. Levels speed up.
// ============================================================================

function BrickApp() {
  const W = 308, H = 232;
  const cvsRef = React.useRef(null);
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [level, setLevel] = React.useState(1);
  const [best, setBest] = React.useState(() => {
    try { return parseInt(localStorage.getItem("mbmac.brick.best") || "0", 10); } catch (e) { return 0; }
  });
  const [bestBy, setBestBy] = React.useState(() => {
    try { return localStorage.getItem("mbmac.brick.initials") || ""; } catch (e) { return ""; }
  });
  const [state, setState] = React.useState("idle"); // idle | run | stuck | over | initials
  const g = React.useRef(null);

  const ROWS = 5, COLS = 8, BW = 34, BH = 10, GAP = 2.5, TOP = 26;
  const rowColors = ["#cc5a45", "#d97d52", "#d9b552", "#7fc06a", "#5aa873"];
  const rowPts = [50, 40, 30, 20, 10];

  const freshBricks = () => {
    const b = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        b.push({ r, c, x: 8 + c * (BW + GAP), y: TOP + r * (BH + GAP), alive: true });
    return b;
  };
  const fresh = (lvl = 1, keepScore = 0) => ({
    px: W / 2 - 26, pw: 52,
    bx: W / 2, by: H - 24, vx: 0, vy: 0,
    speed: 2.1 * Math.pow(1.15, lvl - 1),
    bricks: freshBricks(),
    score: keepScore,
    stuck: true,
  });

  const draw = () => {
    const s = g.current;
    const ctx = cvsRef.current && cvsRef.current.getContext("2d");
    if (!ctx || !s) return;
    ctx.fillStyle = "#0c130d";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(125,240,168,0.05)";
    for (let y = 0; y < H; y += 14) ctx.fillRect(0, y, W, 1);
    s.bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = rowColors[b.r];
      ctx.fillRect(b.x, b.y, BW, BH);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(b.x, b.y + BH - 2, BW, 2);
    });
    // paddle
    ctx.fillStyle = "#a8ffc8";
    ctx.fillRect(s.px, H - 14, s.pw, 6);
    // ball
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(s.bx - 3, s.by - 3, 6, 6);
  };

  const launch = () => {
    const s = g.current;
    if (!s || !s.stuck) return;
    const a = (-Math.PI / 2) + (Math.random() * 0.7 - 0.35);
    s.vx = Math.cos(a) * s.speed;
    s.vy = Math.sin(a) * s.speed;
    s.stuck = false;
  };

  const step = () => {
    const s = g.current;
    if (!s) return;
    if (s.stuck) {
      s.bx = s.px + s.pw / 2;
      s.by = H - 20;
      draw();
      return;
    }
    s.bx += s.vx;
    s.by += s.vy;
    if (s.bx < 4 || s.bx > W - 4) { s.vx *= -1; s.bx = Math.max(4, Math.min(W - 4, s.bx)); }
    if (s.by < 4) { s.vy *= -1; s.by = 4; }
    // paddle
    if (s.vy > 0 && s.by >= H - 17 && s.by <= H - 8 && s.bx >= s.px - 4 && s.bx <= s.px + s.pw + 4) {
      const hit = ((s.bx - s.px) / s.pw) * 2 - 1; // -1..1
      const sp = Math.hypot(s.vx, s.vy);
      const a = -Math.PI / 2 + hit * 1.05;
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp;
      s.by = H - 18;
      MacSound.click();
    }
    // bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (s.bx > b.x - 3 && s.bx < b.x + BW + 3 && s.by > b.y - 3 && s.by < b.y + BH + 3) {
        b.alive = false;
        s.score += rowPts[b.r];
        setScore(s.score);
        MacSound.coin();
        // bounce off nearest face
        const dx = Math.min(Math.abs(s.bx - b.x), Math.abs(s.bx - (b.x + BW)));
        const dy = Math.min(Math.abs(s.by - b.y), Math.abs(s.by - (b.y + BH)));
        if (dx < dy) s.vx *= -1; else s.vy *= -1;
        break;
      }
    }
    // cleared?
    if (s.bricks.every((b) => !b.alive)) {
      MacSound.trade(true);
      const nl = level + 1;
      setLevel(nl);
      g.current = fresh(nl, s.score);
      draw();
      return;
    }
    // dropped
    if (s.by > H + 6) {
      MacSound.error();
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) {
          if (s.score > best && s.score > 0) setState("initials");
          else setState("over");
        } else {
          s.stuck = true;
        }
        return nl;
      });
    }
    draw();
  };

  React.useEffect(() => {
    if (state !== "run") return;
    const id = setInterval(step, 16);
    return () => clearInterval(id);
  }, [state, level, best]);

  React.useEffect(() => {
    const onKey = (e) => {
      const s = g.current;
      if (!s) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); s.px = Math.max(0, s.px - 18); }
      else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); s.px = Math.min(W - s.pw, s.px + 18); }
      else if (e.key === " ") { e.preventDefault(); e.stopPropagation(); launch(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const onMove = (e) => {
    const s = g.current;
    const cvs = cvsRef.current;
    if (!s || !cvs) return;
    const r = cvs.getBoundingClientRect();
    s.px = Math.max(0, Math.min(W - s.pw, ((e.clientX - r.left) / r.width) * W - s.pw / 2));
    if (state !== "run") draw();
  };

  const start = () => {
    MacSound.open();
    g.current = fresh(1, 0);
    setScore(0);
    setLives(3);
    setLevel(1);
    setState("run");
    draw();
  };

  React.useEffect(() => {
    g.current = fresh();
    draw();
  }, []);

  return (
    <div className="snake-body">
      <div className="snake-hud">
        <span>SCORE {score}</span>
        <span>LVL {level} · ♥{Math.max(0, lives)}</span>
        <span>BEST {best}{bestBy ? ` · ${bestBy}` : ""}</span>
      </div>
      <div className="snake-stage" onPointerMove={onMove} onClick={() => state === "run" && launch()}>
        <canvas ref={cvsRef} width={W} height={H}></canvas>
        {state === "initials" && (
          <div className="snake-over">
            <InitialsPrompt
              score={score}
              onDone={(ini) => {
                setBest(score);
                setBestBy(ini);
                try {
                  localStorage.setItem("mbmac.brick.best", String(score));
                  localStorage.setItem("mbmac.brick.initials", ini);
                } catch (e) {}
                setState("over");
              }}
            />
          </div>
        )}
        {state !== "run" && state !== "initials" && (
          <div className="snake-over" onClick={start}>
            <span>{state === "over" ? "SOLD OFF." : "BRICK '87"}</span>
            {state === "over" && <span className="sub">final: {score}</span>}
            <span className="sub">click to {state === "over" ? "re-enter" : "start"} · mouse moves · click / space launches</span>
          </div>
        )}
      </div>
      <span className="snake-hint">break through the resistance · red bricks pay best</span>
    </div>
  );
}


export { BrickApp };
