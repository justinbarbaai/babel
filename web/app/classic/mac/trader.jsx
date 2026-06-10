"use client";

import React from "react";
import { InitialsPrompt } from "./accessories";
import { MacGlyphs } from "./icons";
import { MacDialog } from "./mac-window";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — BUBBLE TRADER
// The paper-money day-trading desk accessory. $10,000 of pretend capital,
// ten live-wiggling coins (several extremely ill-advised), leverage up to 20x,
// liquidations (REKT), market-moving headlines, records, and a margin-call
// bomb if you blow up. No real money. Obviously.
// ============================================================================

const TRADER_COINS = [
  { sym: "BUBL", name: "Bubble Coin", p0: 1.0, vol: 0.045, drift: 0.0006 },
  { sym: "BTC", name: "Bitcoin", p0: 68421, vol: 0.006, drift: 0.0002 },
  { sym: "ETH", name: "Ethereum", p0: 3580, vol: 0.008, drift: 0.0002 },
  { sym: "SOL", name: "Solana", p0: 172.3, vol: 0.012, drift: 0.0003 },
  { sym: "HYPE", name: "Hyperliquid", p0: 38.6, vol: 0.018, drift: 0.0004 },
  { sym: "DOGE", name: "Dogecoin", p0: 0.164, vol: 0.02, drift: 0.0 },
  { sym: "WIF", name: "dogwifhat", p0: 2.41, vol: 0.028, drift: 0.0002 },
  { sym: "PEPE", name: "Pepe", p0: 0.0000121, vol: 0.034, drift: 0.0001 },
  { sym: "FART", name: "Fartcoin", p0: 0.86, vol: 0.05, drift: 0.0003 },
  { sym: "RUG", name: "Rug Pull Inu", p0: 0.0042, vol: 0.09, drift: -0.002 },
];

const TRADER_NEWS = [
  { t: "whale wallet wakes up and market-buys {C}", k: 1 },
  { t: "{C} ETF rumor hits the wire", k: 1 },
  { t: "Ansem calls {C} 'still early' live on air", k: 1 },
  { t: "Banks says he is 'generationally long' {C}", k: 1 },
  { t: "{C} trends on crypto twitter", k: 1 },
  { t: "THE SHOW IS LIVE — chat is aping {C}", k: 1 },
  { t: "{C} listed on a major exchange", k: 1 },
  { t: "famous short-seller flips long on {C}", k: 1 },
  { t: "exchange hot wallet dumps {C}", k: -1 },
  { t: "{C} dev team 'taking a short break'", k: -1 },
  { t: "leverage flush: {C} longs liquidated", k: -1 },
  { t: "regulators 'looking into' {C}", k: -1 },
  { t: "{C} bridge exploited for $40M", k: -1 },
  { t: "top {C} wallet moves coins to exchange", k: -1 },
  { t: "influencer quietly deletes {C} tweets", k: -1 },
  { t: "{C} foundation 'restructuring treasury'", k: -1 },
];

function tFmtPrice(p) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(7);
}
function tFmtUsd(v) {
  const a = Math.abs(v);
  const s = a >= 1000 ? Math.round(a).toLocaleString() : a.toFixed(2);
  return `${v < 0 ? "−" : ""}$${s}`;
}

// v2 portfolio: leveraged positions {sym: {q, avg, lev, margin}} + records
function loadPort() {
  try {
    const raw = localStorage.getItem("mbmac.trader.v2");
    if (raw) return JSON.parse(raw);
    // migrate v1 (plain qty/avg) into 1x positions
    const old = localStorage.getItem("mbmac.trader.v1");
    if (old) {
      const p = JSON.parse(old);
      const pos = {};
      Object.keys(p.qty || {}).forEach((s) => {
        const q = p.qty[s];
        if (q > 0.0000001) pos[s] = { q, avg: p.avg[s] || 0, lev: 1, margin: q * (p.avg[s] || 0) };
      });
      return { cash: p.cash ?? 10000, pos, log: p.log || [], won: !!p.won, best: 10000, rekts: 0 };
    }
  } catch (e) {}
  return { cash: 10000, pos: {}, log: [], won: false, best: 10000, bestBy: "", rekts: 0 };
}

function TraderApp() {
  const eng = React.useRef(null);
  if (!eng.current) {
    eng.current = {
      coins: TRADER_COINS.map((c) => ({
        ...c,
        price: c.p0,
        hist: Array.from({ length: 90 }, () => c.p0 * (1 + (Math.random() - 0.5) * 0.01)),
        shock: 0,
      })),
      tick: 0,
    };
  }
  const [, force] = React.useReducer((n) => n + 1, 0);
  const [sel, setSel] = React.useState("BUBL");
  const [size, setSize] = React.useState(0.5); // 0.25 | 0.5 | 1
  const [lev, setLev] = React.useState(1); // 1 | 5 | 20
  const [port, setPort] = React.useState(loadPort);
  const [flash, setFlash] = React.useState(null);
  const [dlg, setDlg] = React.useState(null); // "margin" | "moon" | {rekt}
  const [askInit, setAskInit] = React.useState(false);
  const sessionBest0 = React.useRef(null);
  if (sessionBest0.current === null) sessionBest0.current = port.best || 10000;
  const askedInit = React.useRef(false);
  const cvsRef = React.useRef(null);

  // persist portfolio
  React.useEffect(() => {
    try { localStorage.setItem("mbmac.trader.v2", JSON.stringify(port)); } catch (e) {}
  }, [port]);

  // price engine
  React.useEffect(() => {
    const id = setInterval(() => {
      const e = eng.current;
      e.tick++;
      e.coins.forEach((c) => {
        const noise = (Math.random() * 2 - 1) * c.vol;
        const shock = c.shock * 0.25;
        c.shock *= 0.72;
        // RUG occasionally rips 40% to bait you back in
        const pump = c.sym === "RUG" && Math.random() < 0.004 ? 0.4 : 0;
        c.price = Math.max(c.p0 * 0.02, c.price * (1 + c.drift + noise + shock + pump));
        c.hist.push(c.price);
        if (c.hist.length > 160) c.hist.shift();
      });
      // market-moving headline every ~18 ticks
      if (e.tick % 18 === 9) {
        const coin = e.coins[Math.floor(Math.random() * e.coins.length)];
        const n = TRADER_NEWS[Math.floor(Math.random() * TRADER_NEWS.length)];
        const mag = (0.05 + Math.random() * 0.2) * n.k * (coin.sym === "BUBL" ? 2.2 : 1);
        coin.shock += mag;
        setFlash({ text: n.t.replace("{C}", coin.sym), up: n.k > 0 });
        setTimeout(() => setFlash(null), 6000);
      }
      force();
    }, 900);
    return () => clearInterval(id);
  }, []);

  const coin = eng.current.coins.find((c) => c.sym === sel);
  const pxOf = (s) => eng.current.coins.find((c) => c.sym === s).price;
  const posList = Object.keys(port.pos || {});
  const equity = port.cash + posList.reduce((sum, s) => {
    const p = port.pos[s];
    return sum + p.margin + (pxOf(s) - p.avg) * p.q;
  }, 0);
  const pnl = equity - 10000;

  // records + liquidations + blow-up / moon checks
  React.useEffect(() => {
    // all-time-high equity
    if (equity > (port.best || 10000) + 0.5) {
      setPort((p) => ({ ...p, best: equity }));
    }
    // beat your stored record meaningfully → sign it, arcade style (once per session)
    if (!askedInit.current && equity > sessionBest0.current + 500 && sessionBest0.current > 10000) {
      askedInit.current = true;
      setAskInit(true);
    }
    // liquidation scan — leveraged positions die when loss eats the margin
    for (const s of posList) {
      const p = port.pos[s];
      if (p.lev > 1 && (p.avg - pxOf(s)) * p.q >= p.margin * 0.97) {
        MacSound.error();
        setPort((pp) => {
          const np = { ...pp.pos };
          delete np[s];
          return {
            ...pp,
            pos: np,
            rekts: (pp.rekts || 0) + 1,
            log: [`LIQUIDATED ${s} ${p.lev}x — margin gone`, ...pp.log].slice(0, 14),
          };
        });
        setDlg({ rekt: s, lev: p.lev, lost: p.margin });
        return;
      }
    }
    const noBags = posList.length === 0;
    if (equity < 100 && noBags && !dlg) {
      MacSound.error();
      setDlg("margin");
    } else if (equity >= 1000000 && !port.won && !dlg) {
      MacSound.startup();
      setDlg("moon");
      setPort((p) => ({ ...p, won: true }));
    }
  });

  // chart painter — phosphor CRT, site market green/red
  React.useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs || !coin) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width, H = cvs.height;
    const h = coin.hist;
    const lo = Math.min(...h), hi = Math.max(...h);
    const pad = (hi - lo) * 0.12 || 1;
    const y = (v) => H - ((v - (lo - pad)) / (hi - lo + pad * 2)) * H;
    ctx.fillStyle = "#0c130d";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(125,240,168,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 5) * i); ctx.lineTo(W, (H / 5) * i); ctx.stroke(); }
    const up = h[h.length - 1] >= h[0];
    // area fill
    ctx.beginPath();
    h.forEach((v, i) => { const x = (i / (h.length - 1)) * W; i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = up ? "rgba(90,168,115,0.16)" : "rgba(204,90,69,0.14)";
    ctx.fill();
    // line
    ctx.beginPath();
    h.forEach((v, i) => { const x = (i / (h.length - 1)) * W; i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); });
    ctx.strokeStyle = up ? "#5aa873" : "#cc5a45";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // avg-cost + liquidation lines if holding
    const p = port.pos[sel];
    if (p && p.q > 0) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255,224,102,0.7)";
      ctx.beginPath(); ctx.moveTo(0, y(p.avg)); ctx.lineTo(W, y(p.avg)); ctx.stroke();
      if (p.lev > 1) {
        const liqPx = p.avg - (p.margin * 0.97) / p.q;
        if (liqPx > lo - pad) {
          ctx.strokeStyle = "rgba(204,90,69,0.85)";
          ctx.beginPath(); ctx.moveTo(0, y(liqPx)); ctx.lineTo(W, y(liqPx)); ctx.stroke();
          ctx.fillStyle = "rgba(204,90,69,0.85)";
          ctx.font = "8px monospace";
          ctx.fillText("LIQ", W - 24, y(liqPx) - 3);
        }
      }
      ctx.setLineDash([]);
    }
  });

  const trade = (side) => {
    const px = coin.price;
    const cur = port.pos[sel];
    if (side === "buy") {
      const spend = port.cash * size;
      if (spend < 1) return;
      const useLev = cur ? cur.lev : lev; // position's leverage is locked at open
      const q = (spend * useLev) / px;
      MacSound.trade(true);
      setPort((p) => {
        const old = p.pos[sel] || { q: 0, avg: 0, lev: useLev, margin: 0 };
        return {
          ...p,
          cash: p.cash - spend,
          pos: {
            ...p.pos,
            [sel]: {
              q: old.q + q,
              avg: (old.q * old.avg + q * px) / (old.q + q),
              lev: useLev,
              margin: old.margin + spend,
            },
          },
          log: [`BOT ${sel} ${useLev > 1 ? useLev + "x " : ""}${tFmtUsd(spend)} @ ${tFmtPrice(px)}`, ...p.log].slice(0, 14),
        };
      });
    } else {
      if (!cur || cur.q <= 0) return;
      const f = size === 1 ? 1 : size * 2 * 0.5; // 0.25 / 0.5 / 1 of the position
      const q = cur.q * f;
      if (q * px < 0.01) return;
      MacSound.trade(false);
      setPort((p) => {
        const c0 = p.pos[sel];
        const realized = q * (px - c0.avg);
        const marginBack = c0.margin * f;
        const np = { ...p.pos };
        if (f >= 0.999) delete np[sel];
        else np[sel] = { ...c0, q: c0.q - q, margin: c0.margin - marginBack };
        return {
          ...p,
          cash: p.cash + marginBack + realized,
          pos: np,
          log: [`SLD ${sel} ${tFmtUsd(marginBack + realized)} (${realized >= 0 ? "+" : ""}${tFmtUsd(realized)}) @ ${tFmtPrice(px)}`, ...p.log].slice(0, 14),
        };
      });
    }
  };

  const resetPort = () => {
    setPort((p) => ({ cash: 10000, pos: {}, log: ["MARGIN CALL — fresh $10,000 wired in"], won: false, best: p.best || 10000, rekts: p.rekts || 0 }));
    setDlg(null);
  };

  const held = port.pos[sel];
  const heldQ = held ? held.q : 0;
  const unreal = held ? (coin.price - held.avg) * held.q : 0;
  const chg = ((coin.hist[coin.hist.length - 1] - coin.hist[0]) / coin.hist[0]) * 100;

  return (
    <div className="trader">
      <div className="trader-tape">
        {flash ? (
          <span className="news-flash">⚡ {flash.text}</span>
        ) : (
          eng.current.coins.map((c) => (
            <span key={c.sym}>{c.sym} {tFmtPrice(c.price)}</span>
          ))
        )}
      </div>
      <div className="trader-main">
        <div className="trader-coins">
          {eng.current.coins.map((c) => {
            const cChg = ((c.hist[c.hist.length - 1] - c.hist[0]) / c.hist[0]) * 100;
            return (
              <button key={c.sym} className={`trader-coin${sel === c.sym ? " on" : ""}`} onClick={() => { MacSound.click(); setSel(c.sym); }}>
                <span className="tc-sym">{c.sym}{port.pos[c.sym] ? " •" : ""}</span>
                <span className="tc-px">${tFmtPrice(c.price)}</span>
                <span className={`tc-ch ${cChg >= 0 ? "up" : "down"}`}>{cChg >= 0 ? "▲" : "▼"} {Math.abs(cChg).toFixed(1)}%</span>
              </button>
            );
          })}
        </div>
        <div className="trader-chartwrap">
          <canvas ref={cvsRef} className="trader-chart" width={390} height={236}></canvas>
          <div className="trader-quote">
            {sel} ${tFmtPrice(coin.price)}
            <span className={`ch ${chg >= 0 ? "up" : "down"}`}>{chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%</span>
          </div>
        </div>
        <div className="trader-side">
          <div className="ts-row"><span>CASH</span><b>{tFmtUsd(port.cash)}</b></div>
          <div className="ts-row"><span>EQUITY</span><b>{tFmtUsd(equity)}</b></div>
          <div className="ts-row"><span>P&L</span><b className={pnl >= 0 ? "up" : "down"}>{tFmtUsd(pnl)}</b></div>
          <div className="ts-row"><span>BEST</span><b>{tFmtUsd(port.best || 10000)}{port.bestBy ? ` ${port.bestBy}` : ""}</b></div>
          <div className="ts-row"><span>REKTS</span><b className={port.rekts ? "down" : ""}>{port.rekts || 0}</b></div>
          <div className="ts-rule"></div>
          <div className="ts-row"><span>{sel} BAG</span><b>{heldQ > 0 ? heldQ.toFixed(heldQ < 10 ? 3 : 1) : "—"}{held && held.lev > 1 ? ` (${held.lev}x)` : ""}</b></div>
          <div className="ts-row"><span>UNREAL.</span><b className={unreal >= 0 ? "up" : "down"}>{heldQ > 0 ? tFmtUsd(unreal) : "—"}</b></div>
          <div className="ts-rule"></div>
          <div className="trade-size lev">
            {[[1, "1x"], [5, "5x"], [20, "20x"]].map(([v, l]) => (
              <button
                key={l}
                className={`${(held ? held.lev : lev) === v ? "on" : ""}${v === 20 ? " danger" : ""}`}
                disabled={!!held && held.lev !== v}
                title={held ? "leverage locks while you hold a position" : v === 20 ? "extremely ill-advised" : ""}
                onClick={() => { MacSound.click(); setLev(v); }}
              >{l}</button>
            ))}
          </div>
          <div className="trade-size">
            {[[0.25, "25%"], [0.5, "50%"], [1, "MAX"]].map(([v, l]) => (
              <button key={l} className={size === v ? "on" : ""} onClick={() => { MacSound.click(); setSize(v); }}>{l}</button>
            ))}
          </div>
          <div className="trade-btns">
            <button className="trade-btn buy" onClick={() => trade("buy")} disabled={port.cash < 1}>BUY</button>
            <button className="trade-btn sell" onClick={() => trade("sell")} disabled={heldQ <= 0}>SELL</button>
          </div>
          <div className="ts-rule"></div>
          <div className="trader-log">
            {port.log.length === 0 && <div>no fills yet. the tape is patient.</div>}
            {port.log.map((l, i) => (<div key={i}>{l}</div>))}
          </div>
        </div>
      </div>

      {askInit && (
        <div className="trader-init-veil">
          <InitialsPrompt
            label="NEW EQUITY RECORD"
            score={tFmtUsd(equity)}
            onDone={(ini) => {
              setPort((p) => ({ ...p, bestBy: ini }));
              setAskInit(false);
            }}
          />
        </div>
      )}

      {dlg === "margin" && (
        <MacDialog
          danger
          icon={MacGlyphs.bomb}
          title="MARGIN CALL."
          sub={`You traded $10,000 down to ${tFmtUsd(equity)}. The desk is wiring you a fresh (pretend) $10,000. ID = -3000`}
          button="Re-fund me"
          onClose={resetPort}
        />
      )}
      {dlg && dlg.rekt && (
        <MacDialog
          danger
          icon={MacGlyphs.bomb}
          title={`REKT. ${dlg.rekt} ${dlg.lev}x liquidated.`}
          sub={`The market came for your margin and took all ${tFmtUsd(dlg.lost)} of it. The candle didn't even slow down. ID = 0x${(port.rekts || 1).toString(16).toUpperCase()}REKT`}
          button="It's still early"
          onClose={() => setDlg(null)}
        />
      )}
      {dlg === "moon" && (
        <MacDialog
          icon={MacGlyphs.trader}
          title="$1,000,000. You absolute legend."
          sub="The yacht is spiritual, the gains are imaginary, the bragging rights are real. Screenshot this."
          button="Keep trading"
          onClose={() => setDlg(null)}
        />
      )}
    </div>
  );
}


export { TraderApp };
