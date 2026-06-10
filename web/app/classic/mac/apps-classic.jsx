"use client";

import React from "react";
import { MacData } from "./data";
import { MacGlyphs, RainbowMark } from "./icons";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — classic app windows
// Markets (ticking ledger), Chat (live-feeling feed + composer), News Wire,
// Polymarket board, About, Read Me, Trash, host easter eggs.
// ============================================================================

// ---- Markets: random-walk ticking ledger ----
function MarketsApp() {
  const [rows, setRows] = React.useState(() =>
    MacData.TICKERS.map((t) => ({ ...t, ch: (Math.random() * 4 - 1.2) }))
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setRows((rs) =>
        rs.map((r) => {
          const drift = (Math.random() - 0.485) * 0.6;
          const ch = Math.max(-12, Math.min(15, r.ch + drift));
          return { ...r, price: r.price * (1 + drift / 300), ch };
        })
      );
    }, 1400);
    return () => clearInterval(id);
  }, []);
  const fmt = (p) => (p < 1 ? p.toFixed(3) : p < 100 ? p.toFixed(2) : Math.round(p).toLocaleString());
  return (
    <div>
      {rows.map((r) => (
        <div className="mkt-row" key={r.sym}>
          <span className="mkt-tk">{r.sym}</span>
          <span className="mkt-px">${fmt(r.price)}</span>
          <span className={`mkt-ch ${r.ch >= 0 ? "up" : "down"}`}>
            {r.ch >= 0 ? "▲" : "▼"} {Math.abs(r.ch).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- Chat: seeded feed + ambient drip + working composer ----
function ChatApp() {
  const [feed, setFeed] = React.useState(() => MacData.CHAT_SEED.slice(0, 6));
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef(null);
  const idx = React.useRef(6);

  React.useEffect(() => {
    const id = setInterval(() => {
      setFeed((f) => {
        const seed = MacData.CHAT_SEED;
        const amb = MacData.CHAT_AMBIENT;
        const next =
          idx.current < seed.length
            ? seed[idx.current]
            : {
                src: ["tw", "kk", "x"][Math.floor(Math.random() * 3)],
                user: ["chartgoblin", "ms_liquidity", "fed_watcher", "dipbuyer9", "@tape_reader"][Math.floor(Math.random() * 5)],
                text: amb[Math.floor(Math.random() * amb.length)],
              };
        idx.current++;
        return [...f.slice(-30), next];
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const el = endRef.current;
    if (el && el.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight;
  }, [feed]);

  const say = () => {
    const text = draft.trim();
    if (!text) return;
    MacSound.click();
    setFeed((f) => [...f.slice(-30), { src: "tw", user: "you", text, you: true }]);
    setDraft("");
  };

  return (
    <div>
      <div className="chat-feed">
        {feed.map((m, i) => (
          <div className="chat-row" key={i}>
            <span className={`src ${m.src}`}>{m.src}</span>
            {m.role && <span className="role">{m.role}</span>}
            <b>{m.user}</b> {m.text}
          </div>
        ))}
        <span ref={endRef}></span>
      </div>
      <div className="chat-compose">
        <input
          value={draft}
          placeholder="Say something to the room…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") say();
          }}
        ></input>
        <button className="mac-btn" onClick={say}>Send</button>
      </div>
    </div>
  );
}

// ---- News Wire — live: fresh headlines drip in up top with a BREAKING flash ----
function NewsApp() {
  const [rows, setRows] = React.useState(() => MacData.NEWS.map((n) => ({ ...n, fresh: false })));
  const idx = React.useRef(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      const wire = MacData.NEWS_WIRE;
      const n = wire[idx.current % wire.length];
      idx.current++;
      setRows((rs) => [{ h: n.h, m: `${n.m} · just in`, fresh: true }, ...rs.map((r) => ({ ...r, fresh: false }))].slice(0, 12));
    }, 9000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      {rows.map((n, i) => (
        <div className={`news-row${n.fresh ? " fresh" : ""}`} key={n.h}>
          <div className="h">{n.fresh && <span className="breaking">BREAKING</span>}{n.h}</div>
          <div className="m">{n.m}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Polymarket board ----
function PolyApp() {
  const [rows, setRows] = React.useState(MacData.POLY);
  React.useEffect(() => {
    const id = setInterval(() => {
      setRows((rs) => rs.map((r) => ({ ...r, yes: Math.max(2, Math.min(97, r.yes + Math.round(Math.random() * 4 - 2))) })));
    }, 3200);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      {rows.map((r, i) => (
        <div className="poly-row" key={i}>
          <span className="poly-q">{r.q}</span>
          <span className="poly-bar"><span className="poly-fill" style={{ width: `${r.yes}%` }}></span></span>
          <span className="poly-pct">YES {r.yes}¢ · NO {100 - r.yes}¢</span>
        </div>
      ))}
    </div>
  );
}

// ---- About ----
function AboutApp() {
  return (
    <div className="about-win">
      <div className="about-head">
        <RainbowMark size={26} />
        <div>
          <div className="about-title">Market&nbsp;Bubble</div>
          <div className="about-sub">System Software 6.0.8</div>
        </div>
      </div>
      <div className="about-rows">
        <div><span>Total Memory</span><b>4,096K</b></div>
        <div><span>Largest Unused Block</span><b>vibes</b></div>
        <div><span>Hosts</span><b>Banks · Ansem</b></div>
        <div><span>Live</span><b>Thursdays 1PM PST</b></div>
      </div>
      <div className="about-foot">Not just a platform. It&rsquo;s what&rsquo;s next.</div>
    </div>
  );
}

// ---- Read Me ----
function ReadMeApp() {
  return (
    <div className="readme-win">
      <p className="readme-h">MARKET&nbsp;BUBBLE — Read Me</p>
      <p>Welcome to the bubble. This whole machine — and the show it watches — lives at the corner of 1986 and next Thursday.</p>
      <p className="readme-secrets">
        Secrets:<br />
        • Konami code: ↑ ↑ ↓ ↓ ← → ← → B A<br />
        • Type &ldquo;moon&rdquo; on the desktop. Type &ldquo;gm.&rdquo;<br />
        • Click the menu-bar clock for the next-show countdown.<br />
        • The keyboard out on the desk is clicky. Go nuts.<br />
        • Leave the machine alone for a while… it dreams.<br />
        • Turn $10,000 into $1,000,000 in Bubble Trader. Easy.<br />
        • 20x leverage is available. That is not a recommendation.<br />
        • Do NOT open the folder marked &ldquo;Do Not Open.&rdquo;
      </p>
      <p className="readme-sig">— The Management</p>
    </div>
  );
}

// ---- Trash ----
function TrashApp({ items = [], onPutBack }) {
  return (
    <div className="trash-win">
      <span style={{ width: 34 }}>{MacGlyphs.trash}</span>
      {items.length === 0 ? (
        <React.Fragment>
          <div className="trash-msg">The Trash is empty.</div>
          <div className="trash-sub">0 items · zero K used · drag desktop icons here</div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div className="trash-msg">{items.length} item{items.length > 1 ? "s" : ""} of pure regret.</div>
          <div className="trash-list">{items.join(" · ")}</div>
          <button className="mac-btn" onClick={() => { MacSound.open(); onPutBack && onPutBack(); }}>Put everything back</button>
        </React.Fragment>
      )}
    </div>
  );
}

// ---- Host easter eggs — social cards with real links ----
function HostApp({ name, quote, avatar, socials = [] }) {
  return (
    <div className="egg-win">
      <img className="egg-av" src={avatar} alt={name}></img>
      <div className="egg-name">{name}</div>
      <div className="egg-quote">&ldquo;{quote}&rdquo;</div>
      {socials.length > 0 && (
        <div className="egg-links">
          {socials.map((s) => (
            <button key={s.url} className="egg-link" onClick={() => { MacSound.click(); window.open(s.url, "_blank", "noopener"); }}>
              <span className="egg-link-plat">{s.platform}</span>
              <span className="egg-link-handle">@{s.handle}</span>
              <span className="egg-link-fol">{s.followers}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export { ChatApp, AboutApp, NewsApp, PolyApp, ReadMeApp, TrashApp, HostApp, MarketsApp };
