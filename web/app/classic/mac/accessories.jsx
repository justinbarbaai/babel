"use client";

import React from "react";
import { MacData } from "./data";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — desk accessories: Calculator, Stickies, Mail,
// Control Panel, and the arcade initials prompt shared by the games.
// ============================================================================

// ---- Calculator: the classic DA, working basic ops ----
function CalculatorApp() {
  const [lcd, setLcd] = React.useState("0");
  const st = React.useRef({ acc: null, op: null, fresh: true });

  const show = (v) => {
    let s = String(v);
    if (s.length > 12) s = Number(v).toPrecision(8).replace(/\.?0+e/, "e").slice(0, 12);
    setLcd(s);
  };
  const digit = (d) => {
    MacSound.keyTap();
    setLcd((cur) => {
      const c = st.current.fresh || cur === "0" ? "" : cur;
      st.current.fresh = false;
      const next = (c + d).slice(0, 12);
      return next === "" || next === "." ? (d === "." ? "0." : d) : next;
    });
  };
  const apply = (a, b, op) => {
    if (op === "+") return a + b;
    if (op === "−") return a - b;
    if (op === "×") return a * b;
    if (op === "÷") return b === 0 ? NaN : a / b;
    return b;
  };
  const setOp = (op) => {
    MacSound.click();
    const v = parseFloat(lcd);
    const s = st.current;
    if (s.acc != null && s.op && !s.fresh) {
      const r = apply(s.acc, v, s.op);
      s.acc = r;
      show(Number.isNaN(r) ? "Error" : r);
    } else {
      s.acc = v;
    }
    s.op = op;
    s.fresh = true;
  };
  const equals = () => {
    MacSound.click();
    const s = st.current;
    if (s.acc == null || !s.op) return;
    const r = apply(s.acc, parseFloat(lcd), s.op);
    show(Number.isNaN(r) ? "Error" : r);
    s.acc = null;
    s.op = null;
    s.fresh = true;
  };
  const clear = () => {
    MacSound.click();
    st.current = { acc: null, op: null, fresh: true };
    setLcd("0");
  };

  const B = ({ label, on, cls = "" }) => (
    <button className={cls} onClick={on}>{label}</button>
  );

  return (
    <div className="calc">
      <div className="calc-lcd">{lcd}</div>
      <div className="calc-grid">
        <B label="C" on={clear} cls="op" />
        <B label="±" on={() => { MacSound.click(); setLcd((c) => (c.startsWith("-") ? c.slice(1) : c === "0" ? c : "-" + c)); }} cls="op" />
        <B label="%" on={() => { MacSound.click(); show(parseFloat(lcd) / 100); st.current.fresh = true; }} cls="op" />
        <B label="÷" on={() => setOp("÷")} cls="op" />
        <B label="7" on={() => digit("7")} />
        <B label="8" on={() => digit("8")} />
        <B label="9" on={() => digit("9")} />
        <B label="×" on={() => setOp("×")} cls="op" />
        <B label="4" on={() => digit("4")} />
        <B label="5" on={() => digit("5")} />
        <B label="6" on={() => digit("6")} />
        <B label="−" on={() => setOp("−")} cls="op" />
        <B label="1" on={() => digit("1")} />
        <B label="2" on={() => digit("2")} />
        <B label="3" on={() => digit("3")} />
        <B label="+" on={() => setOp("+")} cls="op" />
        <B label="0" on={() => digit("0")} cls="wide" />
        <B label="." on={() => digit(".")} />
        <B label="=" on={equals} cls="op" />
      </div>
    </div>
  );
}

// ---- Stickies: a typeable note that persists ----
function StickiesApp({ storageKey = "mbmac.sticky.1" }) {
  const [text, setText] = React.useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? "buy low\nsell high\nfeed the cat";
    } catch (e) {
      return "";
    }
  });
  React.useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(storageKey, text); } catch (e) {}
    }, 350);
    return () => clearTimeout(id);
  }, [text, storageKey]);
  return (
    <div className="sticky-body">
      <textarea
        className="sticky-note"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      ></textarea>
      <div className="sticky-foot">
        <span>saved to this machine</span>
        <span>{text.length}K</span>
      </div>
    </div>
  );
}

// ---- Mail: letters from The Management ----
function MailApp() {
  const [read, setRead] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("mbmac.mail.read") || "[]"); } catch (e) { return []; }
  });
  const [open, setOpen] = React.useState(null);
  const openLetter = (m) => {
    MacSound.paper();
    setOpen(m);
    if (!read.includes(m.id)) {
      const nr = [...read, m.id];
      setRead(nr);
      try { localStorage.setItem("mbmac.mail.read", JSON.stringify(nr)); } catch (e) {}
    }
  };
  if (open) {
    return (
      <div className="mail">
        <button className="mail-back" onClick={() => { MacSound.click(); setOpen(null); }}>‹ Inbox</button>
        <div className="mail-head">
          <div className="mail-subj">{open.subj}</div>
          <div className="mail-from">From: {open.from}</div>
        </div>
        <div className="mail-body">{open.body}</div>
      </div>
    );
  }
  return (
    <div className="mail">
      <div className="mail-count">{MacData.MAIL.length - read.length || "No"} unread</div>
      {MacData.MAIL.map((m) => (
        <button key={m.id} className="mail-row" onClick={() => openLetter(m)}>
          <span className={`mail-dot${read.includes(m.id) ? " off" : ""}`}></span>
          <span className="mail-meta">
            <b>{m.subj}</b>
            <i>{m.from}</i>
          </span>
        </button>
      ))}
    </div>
  );
}

// ---- Control Panel: speaker volume + desktop pattern, System-6 style ----
function ControlPanelApp({ patterns, pat, setPat }) {
  const [vol, setVol] = React.useState(() => Math.round((MacSound ? MacSound.volume : 1) * 100));
  const [ambOn, setAmbOn] = React.useState(() => (MacSound ? MacSound.ambientOn : false));
  return (
    <div className="cpanel">
      <div className="cp-section">
        <div className="cp-label">Speaker Volume</div>
        <div className="cp-volrow">
          <span className="cp-spk">MIN</span>
          <input
            type="range" min="0" max="100" value={vol}
            onChange={(e) => { const v = +e.target.value; setVol(v); MacSound.setVolume(v / 100); }}
            onPointerUp={() => MacSound.coin()}
          ></input>
          <span className="cp-spk loud">MAX</span>
        </div>
        <div className="cp-hint">{vol === 0 ? "silent running" : vol < 35 ? "library mode" : vol < 75 ? "office appropriate" : "full send"}</div>
      </div>
      <div className="cp-rule"></div>
      <div className="cp-section">
        <div className="cp-label">Ambient</div>
        <button
          className="cp-amb"
          onClick={() => {
            MacSound.click();
            ambOn ? MacSound.stopAmbient() : MacSound.startAmbient();
            setAmbOn(!ambOn);
          }}
        >
          <span className={`cp-led${ambOn ? " on" : ""}`}></span>
          Room tone {ambOn ? "ON" : "OFF"}
        </button>
        <div className="cp-hint">a quiet lo-fi hum + vinyl crackle</div>
      </div>
      <div className="cp-rule"></div>
      <div className="cp-section">
        <div className="cp-label">Desktop Pattern</div>
        <div className="pat-grid">
          {patterns.map((p, i) => (
            <button key={p.key} className={`pat-sw ${i === pat ? "on" : ""}`} style={p.style} title={p.label} onClick={() => { MacSound.click(); setPat(i); }}></button>
          ))}
        </div>
        <div className="pat-name">{patterns[pat].label}</div>
      </div>
    </div>
  );
}

// ---- The Bullpen: trophy case of every record on the machine ----
function BullpenApp() {
  const read = (k, d = "") => {
    try { return localStorage.getItem(k) || d; } catch (e) { return d; }
  };
  let trader = {};
  try { trader = JSON.parse(read("mbmac.trader.v2", "{}")) || {}; } catch (e) {}
  const fmt = (v) => `$${Math.round(v).toLocaleString()}`;
  const rows = [
    { l: "Trader · best equity", v: trader.best ? fmt(trader.best) : "—", by: trader.bestBy || "" },
    { l: "Trader · liquidations", v: String(trader.rekts || 0), by: "", bad: (trader.rekts || 0) > 0 },
    { l: "Snake '86 · best bag", v: read("mbmac.snake.best", "—") || "—", by: read("mbmac.snake.initials") },
    { l: "Brick '87 · best score", v: read("mbmac.brick.best", "—") || "—", by: read("mbmac.brick.initials") },
    { l: "Rug Sweeper · best time", v: read("mbmac.sweep.best") ? `${read("mbmac.sweep.best")}s` : "—", by: "" },
  ];
  return (
    <div className="bullpen">
      <div className="bp-head">HOUSE RECORDS</div>
      {rows.map((r) => (
        <div className="bp-row" key={r.l}>
          <span className="bp-label">{r.l}</span>
          <span className={`bp-val${r.bad ? " bad" : ""}`}>{r.v}{r.by ? <i> {r.by}</i> : null}</span>
        </div>
      ))}
      <div className="bp-foot">{trader.won ? "★ reached $1,000,000 — certified legend" : "reach $1,000,000 in Bubble Trader to get certified"}</div>
    </div>
  );
}

// ---- arcade initials prompt — NEW HIGH SCORE, enter 3 letters ----
function InitialsPrompt({ score, label = "NEW HIGH SCORE", onDone }) {
  const [chars, setChars] = React.useState([]);
  React.useEffect(() => {
    const onKey = (e) => {
      e.stopPropagation();
      if (/^[a-z0-9]$/i.test(e.key)) {
        MacSound.keyTap();
        setChars((c) => (c.length < 3 ? [...c, e.key.toUpperCase()] : c));
      } else if (e.key === "Backspace") {
        MacSound.click();
        setChars((c) => c.slice(0, -1));
      } else if (e.key === "Enter") {
        setChars((c) => {
          if (c.length === 3) {
            MacSound.coin();
            onDone(c.join(""));
          }
          return c;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);
  return (
    <div className="initials">
      <div className="init-title">{label}</div>
      <div className="init-score">{score}</div>
      <div className="init-slots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`init-slot${chars.length === i ? " cur" : ""}`}>{chars[i] || "_"}</span>
        ))}
      </div>
      <div className="init-hint">type 3 letters · enter to sign</div>
      <button
        className="mac-btn"
        disabled={chars.length < 3}
        onClick={() => { MacSound.coin(); onDone(chars.join("")); }}
      >Sign it</button>
    </div>
  );
}


export { InitialsPrompt, MailApp, ControlPanelApp, BullpenApp, CalculatorApp, StickiesApp };
