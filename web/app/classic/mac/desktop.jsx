"use client";

import React from "react";
import { BullpenApp, CalculatorApp, ControlPanelApp, MailApp, StickiesApp } from "./accessories";
import { AboutApp, ChatApp, HostApp, MarketsApp, NewsApp, PolyApp, ReadMeApp, TrashApp } from "./apps-classic";
import { BrickApp } from "./brick";
import { MacGlyphs, RainbowMark } from "./icons";
import { MacDialog, MacWindow } from "./mac-window";
import { PaintApp } from "./paint";
import { Screensaver } from "./screensaver";
import { SnakeApp } from "./snake";
import { MacSound } from "./sounds";
import { SweeperApp } from "./sweeper";
import { TraderApp } from "./trader";
// ============================================================================
// Market Bubble Macintosh — the System-6 desktop
// Menu bar + dropdowns, desktop icons, draggable windows (registry-driven),
// dock, desktop patterns, the theater (the real site in the CRT), idle
// screensaver, Konami invert, and the Do-Not-Open bomb.
// ============================================================================

const DESK_PATTERNS = [
  { key: "gray", label: "Gray", style: { backgroundColor: "#9c9c9c", backgroundImage: "repeating-conic-gradient(#8f8f8f 0% 25%, #a6a6a6 0% 50%)", backgroundSize: "4px 4px" } },
  { key: "mac", label: "Classic", style: { backgroundColor: "#5b7f8c", backgroundImage: "repeating-conic-gradient(#54757f 0% 25%, #62848f 0% 50%)", backgroundSize: "4px 4px" } },
  { key: "dots", label: "Dots", style: { backgroundColor: "#cfcabf", backgroundImage: "radial-gradient(#8a857a 1px, transparent 1px)", backgroundSize: "6px 6px" } },
  { key: "twill", label: "Twill", style: { backgroundColor: "#b9b4a8", backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,.09) 0 3px, transparent 3px 6px)" } },
  { key: "bubble", label: "Bubble", style: { background: "radial-gradient(120% 100% at 30% 0%, #b9a7e6, #6e5bb0)" } },
  { key: "aqua", label: "Aqua", style: { background: "linear-gradient(180deg,#8fc5d6,#3f7f95)" } },
];

const HOST_BANKS = {
  name: "FaZe Banks", quote: "Invest in yourself. And maybe buy the dip.", avatar: "https://unavatar.io/twitter/Banks",
  socials: [
    { platform: "X", handle: "Banks", followers: "1.1M", url: "https://x.com/Banks" },
    { platform: "Twitch", handle: "fazebanks", followers: "1.2M", url: "https://twitch.tv/fazebanks" },
  ],
};
const HOST_ANSEM = {
  name: "Ansem", quote: "It\u2019s still early.", avatar: "https://unavatar.io/twitter/blknoiz06",
  socials: [
    { platform: "X", handle: "blknoiz06", followers: "730K", url: "https://x.com/blknoiz06" },
    { platform: "Kick", handle: "ansem", followers: "95K", url: "https://kick.com/ansem" },
  ],
};

// window registry: everything that can open on this machine
const WIN_DEFS = {
  trader: { title: "Bubble Trader", w: 640, x: 36, y: 48, noPad: true, body: () => <TraderApp /> },
  mkt: { title: "Markets", w: 252, x: 60, y: 60, body: () => <MarketsApp /> },
  chat: { title: "Chat", w: 320, x: 380, y: 90, body: () => <ChatApp /> },
  news: { title: "News Wire", w: 430, x: 110, y: 120, h: 250, resizable: true, body: () => <NewsApp /> },
  poly: { title: "Polymarket", w: 360, x: 170, y: 150, body: () => <PolyApp /> },
  paint: { title: "BubblePaint", w: 430, x: 220, y: 70, h: 240, noPad: true, body: () => <PaintApp /> },
  snake: { title: "Snake '86", w: 346, x: 300, y: 80, body: () => <SnakeApp /> },
  brick: { title: "Brick '87", w: 346, x: 320, y: 96, body: () => <BrickApp /> },
  sweeper: { title: "Rug Sweeper", w: 268, x: 360, y: 110, body: () => <SweeperApp /> },
  calc: { title: "Calculator", w: 198, x: 520, y: 110, body: () => <CalculatorApp /> },
  stickies: { title: "Stickies", w: 256, x: 560, y: 220, noPad: true, body: () => <StickiesApp /> },
  about: { title: "About Market Bubble", w: 320, x: 240, y: 140, body: () => <AboutApp /> },
  readme: { title: "Read Me", w: 372, x: 180, y: 100, body: () => <ReadMeApp /> },
  trash: { title: "Trash", w: 214, x: 350, y: 240, body: () => <TrashApp /> },
  banks: { title: "Banks", w: 260, x: 210, y: 130, body: () => <HostApp {...HOST_BANKS} /> },
  ansem: { title: "Ansem", w: 260, x: 250, y: 160, body: () => <HostApp {...HOST_ANSEM} /> },
  mail: { title: "Mail", w: 330, x: 300, y: 110, body: () => <MailApp /> },
  bullpen: { title: "The Bullpen", w: 296, x: 330, y: 140, body: () => <BullpenApp /> },
  control: { title: "Control Panel", w: 232, x: 150, y: 130, body: null /* special-cased below */ },
  patterns: { title: "Desktop Patterns", w: 212, x: 150, y: 130, body: null /* special-cased below */ },
};

function Desktop({ onEject, soundOn, onToggleSound }) {
  const [wins, setWins] = React.useState({}); // key -> {x,y,z}
  const [menu, setMenu] = React.useState(null);
  const [pat, setPat] = React.useState(() => {
    try { return parseInt(localStorage.getItem("mbmac.pattern") || "0", 10) || 0; } catch (e) { return 0; }
  });
  const [theater, setTheater] = React.useState(false);
  // first boot gets a welcome letter; after that the show opens itself
  const [welcome, setWelcome] = React.useState(() => {
    try { return !localStorage.getItem("mbmac.welcomed"); } catch (e) { return false; }
  });
  React.useEffect(() => {
    if (welcome) return;
    const t = setTimeout(() => setTheater(true), 900);
    return () => clearTimeout(t);
  }, []);
  const [shut, setShut] = React.useState(false);
  const shutDown = () => {
    setMenu(null);
    MacSound.eject();
    setShut(true);
    setTimeout(() => onEject("desk"), 1100);
  };
  const [bomb, setBomb] = React.useState(false);
  const [erase, setErase] = React.useState(false);
  const [disk, setDisk] = React.useState(false);
  const [trashed, setTrashed] = React.useState(() => new Set());
  const [inverted, setInverted] = React.useState(false);
  const [saver, setSaver] = React.useState(false);
  const [clock, setClock] = React.useState("");
  const zRef = React.useRef(10);
  const rootRef = React.useRef(null);
  const [bounds, setBounds] = React.useState({ w: 1000, h: 700 });

  // ---- window management ----
  const openWin = (k) => {
    setWins((w) => {
      if (w[k]) return { ...w, [k]: { ...w[k], z: ++zRef.current } };
      MacSound.open();
      const def = WIN_DEFS[k];
      // clamp spawn position so windows stay reachable on small screens
      const x = Math.max(4, Math.min(def.x, bounds.w - (def.w || 300) - 10));
      const y = Math.max(26, Math.min(def.y, bounds.h - 140));
      return { ...w, [k]: { x, y, z: ++zRef.current } };
    });
  };
  const closeWin = (k) => {
    MacSound.close();
    setWins((w) => {
      const n = { ...w };
      delete n[k];
      return n;
    });
  };
  const focusWin = (k) => setWins((w) => (w[k] && w[k].z === zRef.current ? w : { ...w, [k]: { ...w[k], z: ++zRef.current } }));
  const moveWin = (k, x, y) => setWins((w) => ({ ...w, [k]: { ...w[k], x, y } }));

  // ---- clock ----
  React.useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  // ---- bounds ----
  React.useEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (el) setBounds({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ---- close menus on outside click ----
  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  // ---- resume ambient room tone if it was on last session ----
  React.useEffect(() => {
    if (MacSound && MacSound.ambientWanted && !MacSound.ambientOn) {
      MacSound.startAmbient();
    }
  }, []);

  // ---- typed eggs: "moon" sends the mark flying; "gm" rings the bell ----
  const [rocket, setRocket] = React.useState(false);
  React.useEffect(() => {
    let buf = "";
    const onKey = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf.endsWith("moon")) {
        buf = "";
        MacSound.open();
        setRocket(true);
        setTimeout(() => setRocket(false), 2600);
      } else if (buf.endsWith("gm")) {
        buf = "";
        MacSound.coin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- clock ↔ next-show countdown (Thursdays 1PM PST) ----
  const [clockMode, setClockMode] = React.useState("time");
  const showCountdown = () => {
    const now = new Date();
    // next Thursday 13:00 in America/Los_Angeles, approximated locally
    const target = new Date(now);
    const day = now.getDay();
    let add = (4 - day + 7) % 7;
    target.setDate(now.getDate() + add);
    target.setHours(13, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 7);
    const ms = target - now;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return d > 0 ? `SHOW T−${d}d ${h}h` : `SHOW T−${h}h ${m}m`;
  };

  // ---- Konami invert ----
  React.useEffect(() => {
    const seq = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    let i = 0;
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          setInverted((v) => !v);
          MacSound.open();
          i = 0;
        }
      } else i = k === seq[0] ? 1 : 0;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- idle screensaver (75s without input) ----
  React.useEffect(() => {
    let t;
    const arm = () => {
      clearTimeout(t);
      t = setTimeout(() => setSaver(true), 75000);
    };
    const evs = ["pointermove", "pointerdown", "keydown", "wheel"];
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);

  // ---- persist pattern ----
  React.useEffect(() => {
    try { localStorage.setItem("mbmac.pattern", String(pat)); } catch (e) {}
  }, [pat]);

  const topOpenWin = () => {
    const keys = Object.keys(wins);
    if (!keys.length) return null;
    return keys.reduce((a, b) => (wins[a].z > wins[b].z ? a : b));
  };

  // ---- menus ----
  const item = (label, action, disabled) => ({ label, action, disabled });
  const menus = {
    File: [
      item("New Sticky", () => { setMenu(null); openWin("stickies"); }),
      item("Open Read Me", () => { setMenu(null); openWin("readme"); }),
      "---",
      item("Close Window", () => {
        setMenu(null);
        const k = topOpenWin();
        if (k) closeWin(k);
        else if (theater) setTheater(false);
      }),
    ],
    Edit: [item("Undo", null, true), item("Cut", null, true), item("Copy", null, true), item("Paste", null, true), "---", item("Buy High, Sell Low", null, true)],
    View: [item("by Icon", null, true), item("by Name", null, true), "---", item("Desktop Patterns…", () => { setMenu(null); openWin("control"); })],
    Special: [
      item("Clean Up Desktop", null, true),
      item("Empty Trash…", () => { setMenu(null); openWin("trash"); }),
      item("Erase Disk…", () => { setMenu(null); MacSound.error(); setErase(true); }),
      item("Insert Disk…", () => { setMenu(null); MacSound.floppyClack(); setTimeout(() => { MacSound.error(); setDisk(true); }, 700); }),
      "---",
      item("Start Screensaver", () => { setMenu(null); setSaver(true); }),
      item("Restart", () => { setMenu(null); onEject("restart"); }),
      item("Shut Down", shutDown),
      item("Back to Desk", () => { setMenu(null); onEject("desk"); }),
    ],
  };
  const appleMenu = [
    item("About Market Bubble…", () => { setMenu(null); openWin("about"); }),
    item("Control Panel…", () => { setMenu(null); openWin("control"); }),
    "---",
    item("Market Bubble (Watch)", () => { setMenu(null); MacSound.open(); setTheater(true); }),
    item("Bubble Trader", () => { setMenu(null); openWin("trader"); }),
    item("Calculator", () => { setMenu(null); openWin("calc"); }),
    item("Stickies", () => { setMenu(null); openWin("stickies"); }),
    item("BubblePaint", () => { setMenu(null); openWin("paint"); }),
    item("Snake '86", () => { setMenu(null); openWin("snake"); }),
    item("Brick '87", () => { setMenu(null); openWin("brick"); }),
    item("Rug Sweeper", () => { setMenu(null); openWin("sweeper"); }),
    item("The Bullpen", () => { setMenu(null); openWin("bullpen"); }),
  ];
  const renderMenu = (items) => (
    <div className="dt-dropdown" onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it === "---" ? (
          <div className="dt-dd-sep" key={i}></div>
        ) : (
          <button
            key={i}
            className={`dt-dd-item ${it.disabled ? "off" : ""}`}
            disabled={!!it.disabled}
            onClick={() => {
              if (!it.disabled && it.action) {
                MacSound.click();
                it.action();
              }
            }}
          >
            {it.label}
          </button>
        )
      )}
    </div>
  );

  // ---- desktop icons (right rail) ----
  const apps = [
    { key: "mb", label: "Market Bubble", tile: <span className="app-tile mb">{MacGlyphs.tv}</span>, on: () => { MacSound.open(); setTheater(true); } },
    { key: "trader", label: "Bubble Trader", tile: <span className="app-tile">{MacGlyphs.trader}</span>, on: () => openWin("trader") },
    { key: "mkt", label: "Markets", tile: <span className="app-tile">{MacGlyphs.chart}</span>, on: () => openWin("mkt") },
    { key: "chat", label: "Chat", tile: <span className="app-tile">{MacGlyphs.chat}</span>, on: () => openWin("chat") },
    { key: "news", label: "News Wire", tile: <span className="app-tile">{MacGlyphs.news}</span>, on: () => openWin("news") },
    { key: "poly", label: "Polymarket", tile: <span className="app-tile">{MacGlyphs.poly}</span>, on: () => openWin("poly") },
    { key: "paint", label: "BubblePaint", tile: <span className="app-tile">{MacGlyphs.paint}</span>, on: () => openWin("paint") },
    { key: "snake", label: "Snake '86", tile: <span className="app-tile">{MacGlyphs.snake}</span>, on: () => openWin("snake") },
    { key: "brick", label: "Brick '87", tile: <span className="app-tile">{MacGlyphs.brick}</span>, on: () => openWin("brick") },
    { key: "sweeper", label: "Rug Sweeper", tile: <span className="app-tile">{MacGlyphs.sweeper}</span>, on: () => openWin("sweeper") },
    { key: "stickies", label: "Stickies", tile: <span className="app-tile">{MacGlyphs.sticky}</span>, on: () => openWin("stickies") },
    { key: "mail", label: "Mail", tile: <span className="app-tile">{MacGlyphs.mail}</span>, on: () => openWin("mail") },
    { key: "bullpen", label: "The Bullpen", tile: <span className="app-tile">{MacGlyphs.trophy}</span>, on: () => openWin("bullpen") },
    { key: "readme", label: "Read Me", tile: <span className="app-tile">{MacGlyphs.doc}</span>, on: () => openWin("readme"), egg: true },
    { key: "banks", label: "Banks", tile: <span className="app-tile">{MacGlyphs.tv}</span>, av: HOST_BANKS.avatar, on: () => openWin("banks"), egg: true },
    { key: "ansem", label: "Ansem", tile: <span className="app-tile">{MacGlyphs.tv}</span>, av: HOST_ANSEM.avatar, on: () => openWin("ansem"), egg: true },
    { key: "secret", label: "Do Not Open!", tile: <span className="app-tile">{MacGlyphs.secret}</span>, on: () => { MacSound.click(); setBomb(true); }, egg: true },
    { key: "trash", label: "Trash", tile: <span className="app-tile">{MacGlyphs.trash}</span>, on: () => openWin("trash") },
  ];

  const dock = [
    { key: "show", glyph: MacGlyphs.tv, cls: "mb", title: "Market Bubble", on: () => { MacSound.open(); setTheater(true); }, lit: theater },
    { key: "trader", glyph: MacGlyphs.trader, title: "Bubble Trader", on: () => openWin("trader"), lit: !!wins.trader },
    { key: "mkt", glyph: MacGlyphs.chart, title: "Markets", on: () => openWin("mkt"), lit: !!wins.mkt },
    { key: "chat", glyph: MacGlyphs.chat, title: "Chat", on: () => openWin("chat"), lit: !!wins.chat },
    { key: "news", glyph: MacGlyphs.news, title: "News Wire", on: () => openWin("news"), lit: !!wins.news },
    { key: "paint", glyph: MacGlyphs.paint, title: "BubblePaint", on: () => openWin("paint"), lit: !!wins.paint },
    { key: "snake", glyph: MacGlyphs.snake, title: "Snake '86", on: () => openWin("snake"), lit: !!wins.snake },
    { key: "brick", glyph: MacGlyphs.brick, title: "Brick '87", on: () => openWin("brick"), lit: !!wins.brick },
    { key: "sweeper", glyph: MacGlyphs.sweeper, title: "Rug Sweeper", on: () => openWin("sweeper"), lit: !!wins.sweeper },
    { key: "trash", glyph: MacGlyphs.trash, title: "Trash", on: () => openWin("trash"), lit: !!wins.trash },
  ];

  return (
    <div className={`dt ${inverted ? "inverted" : ""}`} style={DESK_PATTERNS[pat].style} ref={rootRef}>
      <div className="dt-wallmark" aria-hidden="true"><span className="mark"></span></div>

      {/* menu bar */}
      <div className="dt-menubar">
        <button className={`dt-apple ${menu === "apple" ? "on" : ""}`} onPointerDown={(e) => { e.stopPropagation(); setMenu((m) => (m === "apple" ? null : "apple")); }}>
          <RainbowMark size={20} />
          {menu === "apple" && renderMenu(appleMenu)}
        </button>
        {Object.keys(menus).map((name) => (
          <button
            key={name}
            className={`dt-menu ${menu === name ? "on" : ""}`}
            onPointerDown={(e) => { e.stopPropagation(); setMenu((m) => (m === name ? null : name)); }}
            onPointerEnter={() => menu && menu !== name && menu !== "apple" && setMenu(name)}
          >
            {name}
            {menu === name && renderMenu(menus[name])}
          </button>
        ))}
        <span className="dt-menu-spacer"></span>
        <button className="dt-snd" onClick={onToggleSound} title="Sound on/off">{soundOn ? "SND ON" : "SND OFF"}</button>
        <button className="dt-eject" onPointerDown={(e) => { e.stopPropagation(); onEject("desk"); }} title="Back to desk">⤺ Desk</button>
        <button className="dt-clock" onClick={() => { MacSound.click(); setClockMode((m) => (m === "time" ? "show" : "time")); }} title="Click: time ↔ next show">{clockMode === "time" ? clock : showCountdown()}</button>
      </div>

      {/* desktop icons */}
      <div className="dt-apps">
        {apps.filter((a) => !trashed.has(a.key)).map((a) => (
          <button
            key={a.key}
            className={`dt-app ${a.egg ? "egg" : ""}`}
            onClick={a.on}
            onDoubleClick={a.on}
            title={a.key === "trash" ? "Trash — drag icons here" : a.label}
            draggable={a.key !== "trash" && a.key !== "mb"}
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", a.key); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={a.key === "trash" ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } : undefined}
            onDrop={a.key === "trash" ? (e) => {
              e.preventDefault();
              const k = e.dataTransfer.getData("text/plain");
              if (k && k !== "trash" && k !== "mb") {
                MacSound.eject();
                setTrashed((s) => new Set([...s, k]));
              }
            } : undefined}
          >
            {a.av ? (
              <span className="app-tile" style={{ overflow: "hidden", borderRadius: "50%" }}>
                <img src={a.av} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}></img>
              </span>
            ) : (
              a.tile
            )}
            <span className="dt-app-label">{a.label}</span>
          </button>
        ))}
      </div>

      {/* windows */}
      {Object.keys(wins).map((k) => {
        const def = WIN_DEFS[k];
        const st = wins[k];
        return (
          <MacWindow
            key={k}
            title={def.title}
            x={st.x}
            y={st.y}
            z={st.z}
            width={def.w}
            height={def.h}
            resizable={!!def.resizable}
            noPad={!!def.noPad}
            bounds={bounds}
            onMove={(x, y) => moveWin(k, x, y)}
            onClose={() => closeWin(k)}
            onFocus={() => focusWin(k)}
          >
            {k === "patterns" || k === "control" || k === "trash" ? (
              k === "control" ? (
                <ControlPanelApp patterns={DESK_PATTERNS} pat={pat} setPat={setPat} />
              ) : k === "trash" ? (
                <TrashApp
                  items={[...trashed].map((tk) => { const a = apps.find((x) => x.key === tk); return a ? a.label : tk; })}
                  onPutBack={() => setTrashed(new Set())}
                />
              ) : (
                <div>
                  <div className="pat-grid">
                    {DESK_PATTERNS.map((p, i) => (
                      <button key={p.key} className={`pat-sw ${i === pat ? "on" : ""}`} style={p.style} title={p.label} onClick={() => { MacSound.click(); setPat(i); }}></button>
                    ))}
                  </div>
                  <div className="pat-name">{DESK_PATTERNS[pat].label}</div>
                </div>
              )
            ) : (
              def.body()
            )}
          </MacWindow>
        );
      })}

      {/* first-boot welcome */}
      {welcome && (
        <MacDialog
          icon={MacGlyphs.tv}
          title="Welcome to the bubble."
          sub='This machine runs the show. Poke everything — the icons, the games, the folder you were told not to open. Read Me holds the secrets. Mail has your lease.'
          button="Take me to the show"
          onClose={() => {
            try { localStorage.setItem("mbmac.welcomed", "1"); } catch (e) {}
            setWelcome(false);
            MacSound.open();
            setTheater(true);
          }}
        />
      )}

      {/* the bomb */}
      {bomb && (
        <MacDialog
          danger
          icon={MacGlyphs.bomb}
          title="Sorry, a system error occurred."
          sub="told you not to open it. ID = 02"
          button="Restart"
          onClose={() => setBomb(false)}
        />
      )}
      {erase && (
        <MacDialog
          icon={MacGlyphs.secret}
          title="Erase the startup disk?"
          sub="Absolutely not. This machine holds the show."
          button="Fair"
          onClose={() => setErase(false)}
        />
      )}
      {disk && (
        <MacDialog
          icon={MacGlyphs.trash}
          title="This disk is unreadable."
          sub="It appears to be the show's master tape. Do NOT initialize it. ID = -39"
          button="Eject Disk"
          onClose={() => { MacSound.eject(); setDisk(false); }}
        />
      )}

      {/* theater — the site inside the CRT */}
      {theater && (
        <div className="theater">
          <div className="theater-bar">
            <span className="theater-live"><span className="theater-dot"></span> MARKET BUBBLE · LIVE SITE</span>
            <a className="theater-note" href="https://market-bubble-nine.vercel.app" target="_blank" rel="noreferrer">
              open full site ↗
            </a>
            <button className="theater-close" onClick={() => { MacSound.close(); setTheater(false); }} title="Close">✕</button>
          </div>
          {/* the real site, same-origin embed (X-Frame-Options: SAMEORIGIN allows it) */}
          <iframe className="theater-site" src="/" title="Market Bubble"></iframe>
        </div>
      )}

      {/* dock */}
      <div className="dock">
        {dock.map((d) => (
          <button key={d.key} className={`${d.cls || ""} ${d.lit ? "on" : ""}`} title={d.title} onClick={d.on}>
            {d.glyph}
          </button>
        ))}
      </div>

      {/* screensaver */}
      {saver && <Screensaver onWake={() => setSaver(false)} />}

      {/* shut down — the CRT beam collapses */}
      {shut && (
        <div className="shutdown" aria-hidden="true">
          <span className="beam"></span>
        </div>
      )}

      {/* "moon" egg — the mark goes parabolic */}
      {rocket && (
        <div className="moon-rocket" aria-hidden="true">
          <i className="mb-mark-rainbow" style={{ width: 46, color: "#f6f3ea" }}></i>
          <span className="moon-trail"></span>
        </div>
      )}
    </div>
  );
}


export { Desktop };
