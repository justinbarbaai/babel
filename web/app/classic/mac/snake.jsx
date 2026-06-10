"use client";

import React from "react";
import { InitialsPrompt } from "./accessories";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — SNAKE '86
// Pixel snake on the green phosphor grid; eat coins, don't eat yourself.
// High score persists. Arrow keys / WASD.
// ============================================================================

function SnakeApp() {
  const COLS = 22, ROWS = 16, CELL = 14;
  const cvsRef = React.useRef(null);
  const [score, setScore] = React.useState(0);
  const [best, setBest] = React.useState(() => {
    try { return parseInt(localStorage.getItem("mbmac.snake.best") || "0", 10); } catch (e) { return 0; }
  });
  const [bestBy, setBestBy] = React.useState(() => {
    try { return localStorage.getItem("mbmac.snake.initials") || ""; } catch (e) { return ""; }
  });
  const [state, setState] = React.useState("idle"); // idle | run | pause | over | initials
  const game = React.useRef(null);

  const fresh = () => ({
    snake: [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    coin: { x: 14, y: 8 },
    bonus: null, // golden BUBL: {x, y, ttl}
    score: 0,
  });

  const placeCoin = (g) => {
    let p;
    do {
      p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (g.snake.some((s) => s.x === p.x && s.y === p.y));
    g.coin = p;
  };

  const draw = () => {
    const g = game.current;
    const ctx = cvsRef.current && cvsRef.current.getContext("2d");
    if (!ctx || !g) return;
    ctx.fillStyle = "#0c130d";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    // faint scan grid
    ctx.fillStyle = "rgba(125,240,168,0.05)";
    for (let y = 0; y < ROWS; y++) ctx.fillRect(0, y * CELL, COLS * CELL, 1);
    // coin (₿)
    ctx.fillStyle = "#f0a020";
    ctx.fillRect(g.coin.x * CELL + 2, g.coin.y * CELL + 2, CELL - 4, CELL - 4);
    ctx.fillStyle = "#0c130d";
    ctx.font = `bold ${CELL - 4}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₿", g.coin.x * CELL + CELL / 2, g.coin.y * CELL + CELL / 2 + 1);
    // golden BUBL bonus — blinks as it expires
    if (g.bonus && (g.bonus.ttl > 14 || g.bonus.ttl % 2 === 0)) {
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(g.bonus.x * CELL + CELL / 2, g.bonus.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0c130d";
      ctx.font = `bold ${CELL - 6}px monospace`;
      ctx.fillText("B", g.bonus.x * CELL + CELL / 2, g.bonus.y * CELL + CELL / 2 + 1);
    }
    // snake
    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#a8ffc8" : "#46e08a";
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  };

  const step = () => {
    const g = game.current;
    if (!g) return;
    g.dir = g.nextDir;
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const hitSelf = g.snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      MacSound.error();
      if (g.score > best && g.score > 0) {
        setState("initials");
      } else {
        setState("over");
      }
      return;
    }
    g.snake.unshift(head);
    // bonus lifecycle
    if (g.bonus) {
      g.bonus.ttl--;
      if (g.bonus.ttl <= 0) g.bonus = null;
      else if (head.x === g.bonus.x && head.y === g.bonus.y) {
        g.score += 50;
        setScore(g.score);
        MacSound.coin();
        MacSound.coin();
        g.bonus = null;
      }
    } else if (Math.random() < 0.012) {
      let p;
      do {
        p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      } while (g.snake.some((s) => s.x === p.x && s.y === p.y) || (p.x === g.coin.x && p.y === g.coin.y));
      g.bonus = { ...p, ttl: 40 };
    }
    if (head.x === g.coin.x && head.y === g.coin.y) {
      g.score += 10;
      setScore(g.score);
      MacSound.coin();
      placeCoin(g);
    } else {
      g.snake.pop();
    }
    draw();
  };

  React.useEffect(() => {
    if (state !== "run") return;
    const speed = Math.max(80, 150 - Math.floor(score / 50) * 10);
    const id = setInterval(step, speed);
    return () => clearInterval(id);
  }, [state, score]);

  React.useEffect(() => {
    const onKey = (e) => {
      const map = {
        arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        setState((s) => (s === "run" ? "pause" : s === "pause" ? "run" : s));
        return;
      }
      const d = map[e.key.toLowerCase()];
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      const g = game.current;
      if (g && !(d.x === -g.dir.x && d.y === -g.dir.y)) g.nextDir = d;
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const start = () => {
    MacSound.open();
    game.current = fresh();
    setScore(0);
    setState("run");
    draw();
  };

  React.useEffect(() => {
    game.current = fresh();
    draw();
  }, []);

  return (
    <div className="snake-body">
      <div className="snake-hud">
        <span>SCORE {score}</span>
        <span>BEST {best}{bestBy ? ` · ${bestBy}` : ""}</span>
      </div>
      <div className="snake-stage">
        <canvas ref={cvsRef} width={COLS * CELL} height={ROWS * CELL}></canvas>
        {state === "initials" && (
          <div className="snake-over">
            <InitialsPrompt
              score={score}
              onDone={(ini) => {
                setBest(score);
                setBestBy(ini);
                try {
                  localStorage.setItem("mbmac.snake.best", String(score));
                  localStorage.setItem("mbmac.snake.initials", ini);
                } catch (e) {}
                setState("over");
              }}
            />
          </div>
        )}
        {state !== "run" && state !== "initials" && (
          <div className="snake-over" onClick={state === "pause" ? () => setState("run") : start}>
            <span>{state === "over" ? "RUGGED." : state === "pause" ? "PAUSED" : "SNAKE '86"}</span>
            {state === "over" && <span className="sub">final bag: {score}</span>}
            <span className="sub">{state === "pause" ? "space / click to resume" : `click to ${state === "over" ? "re-enter" : "start"} · arrows / WASD · space pauses`}</span>
          </div>
        )}
      </div>
      <span className="snake-hint">eat the ₿ · golden B = +50, it expires · walls are final</span>
    </div>
  );
}


export { SnakeApp };
