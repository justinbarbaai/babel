"use client";

import React from "react";
import { Desktop } from "./desktop";
import { HappyMac, RainbowMark } from "./icons";
import { MacSound } from "./sounds";
// ============================================================================
// Market Bubble Macintosh — the room
// Desk photo with cursor parallax + physical props: a cat you pet, a
// pull-chain lamp that relights the room,
// a mug, a floppy drive, and a keyboard whose keys press down where you click
// (or type). Double-click the keyboard to lean all the way in.
// ============================================================================

// the mouse that lives on the pad: drag it anywhere on the mat — smoothly,
// clamped to the fabric — or just click it.
// wall clock — real local time, ticking
function WallClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <div className="wall-clock" aria-label={`Clock: ${now.toLocaleTimeString()}`}>
      <span className="wc-face">
        <i className="wc-hand wc-h" style={{ transform: `rotate(${h * 30}deg)` }}></i>
        <i className="wc-hand wc-m" style={{ transform: `rotate(${m * 6}deg)` }}></i>
        <i className="wc-hand wc-s" style={{ transform: `rotate(${s * 6}deg)` }}></i>
        <i className="wc-pin"></i>
      </span>
    </div>
  );
}

// the mouse that lives on the pad — cut from the same photo, same lighting.
// Starts exactly where it was photographed; drag it around the mat, smoothly.
function PadMouse() {
  const HOME = { x: 32.5, y: 0 };
  const [pos, setPos] = React.useState(HOME);
  const ref = React.useRef(null);
  const drag = React.useRef(null);

  const onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = ref.current.parentElement.getBoundingClientRect();
    const r = ref.current.getBoundingClientRect();
    drag.current = { rect, moved: false, dx: e.clientX - r.left, dy: e.clientY - r.top };
    ref.current.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const dRef = drag.current;
    if (!dRef) return;
    dRef.moved = true;
    const x = ((e.clientX - dRef.dx - dRef.rect.left) / dRef.rect.width) * 100;
    const y = ((e.clientY - dRef.dy - dRef.rect.top) / dRef.rect.height) * 100;
    setPos({
      x: Math.max(1, Math.min(56, x)),
      y: Math.max(-4, Math.min(12, y)),
    });
  };
  const onUp = () => {
    const dRef = drag.current;
    drag.current = null;
    if (dRef && !dRef.moved) MacSound.mouseClick();
  };

  return (
    <img
      ref={ref}
      className="pad-mouse"
      src="/mouse6.png"
      alt="Mouse — drag me"
      draggable={false}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    ></img>
  );
}

function DeskProps({ onKeyboard, lampOn, setLampOn, active }) {
  const [sip, setSip] = React.useState(false);
  const [pet, setPet] = React.useState(0);
  const [twitch, setTwitch] = React.useState(false);
  const [cold, setCold] = React.useState(false);
  const [rattle, setRattle] = React.useState(false);
  const [flop, setFlop] = React.useState(false);
  const kbdRef = React.useRef(null);
  const coldTimer = React.useRef(null);

  // ---- idle life: the cat shivers/twitches at odd moments ----
  React.useEffect(() => {
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        setTwitch(true);
        setTimeout(() => setTwitch(false), 600);
        schedule();
      }, 8000 + Math.random() * 14000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  // ---- idle life: the coffee cools; a sip warms it back up ----
  const reheat = () => {
    setCold(false);
    clearTimeout(coldTimer.current);
    coldTimer.current = setTimeout(() => setCold(true), 75000);
  };
  React.useEffect(() => {
    reheat();
    return () => clearTimeout(coldTimer.current);
  }, []);

  // (typing only animates the keyboard in the zoomed view — the desk stays still)

  return (
    <React.Fragment>
      {/* the brand canvas — portrait, top-left, MB logotype in ink */}
      <div className="wall-canvas-left" aria-hidden="true">
        <img className="cv-img" src="/canvas2.png" alt="" draggable={false}></img>
        <span className="mark"></span>
        <span className="plaque">MARKET BUBBLE</span>
      </div>

      {/* the canvas — sideways under the clock, the show's words in ink */}
      <div className="wall-canvas" aria-hidden="true">
        <img className="cv-img" src="/canvas_side.png" alt="" draggable={false}></img>
        <span className="cv-quote">“Invest in yourself.”</span>
        <span className="plaque">MARKET BUBBLE</span>
      </div>

      {/* lamp — pull the chain */}
      <button
        className={`prop-lamp${lampOn ? "" : " off"}`}
        aria-label="Lamp"
        title="pull the chain"
        onClick={() => {
          MacSound.chain();
          setLampOn(!lampOn);
        }}
      >
        <span className="lamp-throw" aria-hidden="true"></span>
        <span className="prop-shadow" aria-hidden="true"></span>
        <img src="/lamp.png" alt=""></img>
        <span className="lamp-pool" aria-hidden="true"></span>
        <span className="lamp-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      </button>

      {/* mug — the coffee slowly cools; sip to bring the steam back */}
      <button
        className={`prop-mug${sip ? " sip" : ""}${cold ? " cold" : ""}`}
        aria-label="Coffee"
        title={cold ? "gone cold… take a sip" : "still warm"}
        onClick={() => {
          MacSound.sip();
          setSip(true);
          reheat();
          setTimeout(() => setSip(false), 420);
        }}
      >
        <span className="mug-coaster" aria-hidden="true"></span>
        <span className="prop-shadow" aria-hidden="true"></span>
        <img src="/mug.png" alt=""></img>
        <span className="mug-brand" aria-hidden="true"></span>
        <span className="mug-steam" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>

      {/* cat moved — see below the keyboard zone */}

      {/* pen cup — rattle it */}
      <button
        className={`prop-pencup${rattle ? " rattle" : ""}`}
        aria-label="Pen cup"
        title="pens & pencils"
        onClick={() => {
          MacSound.rattle();
          setRattle(true);
          setTimeout(() => setRattle(false), 520);
        }}
      >
        <span className="prop-shadow" aria-hidden="true"></span>
        <img src="/pencup.png" alt=""></img>
      </button>

      {/* floppy stack — back right, against the wall */}
      <button
        className={`prop-floppies${flop ? " jiggle" : ""}`}
        aria-label="Floppy disks"
        title="the backups"
        onClick={() => {
          MacSound.floppyClack();
          setFlop(true);
          setTimeout(() => setFlop(false), 470);
        }}
      >
        <span className="prop-shadow" aria-hidden="true"></span>
        <img src="/floppystack4.png" alt="" draggable={false}></img>
      </button>

      {/* mouse on its pad — same photo, but the mouse drags around the mat */}
      <div className="prop-mouse">
        <span className="prop-shadow" aria-hidden="true"></span>
        <img className="pad-img" src="/padfinal.png" alt="" draggable={false}></img>
        <PadMouse />
      </div>

      {/* keyboard zone: silent on the desk — double-click to lean in */}
      <button
        ref={kbdRef}
        className="desk-kbd"
        aria-label="Keyboard"
        title="double-click to lean in"
        onDoubleClick={onKeyboard}
      ></button>

      {/* the cat — moved to lounge by the keyboard's right end */}
      <button
        className={`prop-cat${pet ? " pet" : ""}${twitch ? " twitch" : ""}`}
        aria-label="Cat"
        title="pet the cat"
        onPointerDown={() => {
          MacSound.purr();
          setPet((p) => p + 1);
          setTimeout(() => setPet(0), 1450);
        }}
      >
        <span className="prop-shadow" aria-hidden="true"></span>
        <img src="/cat.png" alt=""></img>
        {pet > 0 && (
          <span className="cat-hearts" aria-hidden="true" key={pet}><i>♥</i><i>♥</i><i>♥</i></span>
        )}
      </button>

      {/* (newspaper removed — needs a real photo cutout to sit right) */}

      {/* wall clock — real time */}
      <WallClock />

      {/* floppy drive */}
      <button className="desk-floppy" aria-label="Floppy drive" title="insert disk" onClick={() => MacSound.eject()}></button>
    </React.Fragment>
  );
}

// ---------------------------------------------------------------------------
// Zoomed keyboard: per-key hotspots over the photo. Geometry is MEASURED from
// the photo's pixels (the dark slots between caps) — every cell below is the
// real keycap's left/right edge in % of the image. Do not eyeball-edit.
// ---------------------------------------------------------------------------
const KB_LAYOUT = (() => {
  const R = (y, h, cells) => cells.map(([k, a, b, y2, h2]) => ({ k, x: a, w: b - a, y: y2 ?? y, h: h2 ?? h }));
  return [
    // F row — F1 starts one cap to the right of esc's neighbor
    R(18.7, 11.0, [["Escape", 8.5, 13.0], ["F1", 20.1, 24.9], ["F2", 25.6, 30.7], ["F3", 31.4, 36.8], ["F4", 37.3, 42.4], ["F5", 43.1, 48.2], ["F6", 48.9, 53.9], ["F7", 54.6, 59.7], ["F8", 62.4, 67.3], ["F9", 68.2, 73.1], ["F10", 73.9, 78.9], ["F11", 79.8, 84.7], ["F12", 85.5, 90.5]]),
    // number row — 12 caps + delete + end cap (no "=" cap on this board)
    R(30.5, 10.8, [["`", 8.5, 13.9], ["1", 14.2, 19.7], ["2", 20.0, 25.5], ["3", 25.8, 31.4], ["4", 31.7, 37.2], ["5", 37.5, 43.0], ["6", 43.4, 48.9], ["7", 49.2, 54.7], ["8", 55.0, 60.5], ["9", 60.8, 66.1], ["0", 66.6, 71.8], ["-", 72.4, 77.4], ["Backspace", 78.3, 90.5]]),
    R(42.3, 11.2, [["Tab", 8.5, 15.8], ["q", 17.1, 22.6], ["w", 22.9, 28.5], ["e", 28.8, 34.3], ["r", 34.7, 40.2], ["t", 40.6, 46.0], ["y", 46.4, 51.8], ["u", 52.2, 57.6], ["i", 58.0, 63.3], ["o", 63.8, 69.2], ["p", 69.7, 75.0], ["[", 75.6, 80.7], ["]", 81.4, 90.7]]),
    R(53.7, 11.6, [["CapsLock", 8.5, 17.3], ["a", 18.7, 24.2], ["s", 24.5, 30.1], ["d", 30.4, 36.0], ["f", 36.3, 41.8], ["g", 42.1, 47.6], ["h", 47.9, 53.5], ["j", 53.8, 59.3], ["k", 59.6, 65.0], ["l", 65.4, 70.8], [";", 71.3, 76.3], ["'", 77.1, 82.0], ["Enter", 82.4, 90.8]]),
    R(65.9, 11.2, [["Shift", 8.4, 20.3], ["z", 21.6, 27.2], ["x", 27.5, 33.0], ["c", 33.4, 38.9], ["v", 39.2, 44.7], ["b", 45.0, 50.5], ["n", 50.8, 56.3], ["m", 56.7, 62.2], [",", 62.5, 67.9], [".", 68.3, 73.4], ["RShift", 74.2, 84.7], ["/", 85.6, 90.8]]),
    R(77.3, 12.2, [["Alt", 14.1, 19.0], ["Meta", 20.4, 25.6], [" ", 26.9, 63.1], ["RMeta", 64.0, 69.4], ["RAlt", 70.4, 75.8]]),
  ];
})();

// printed keycap legends — the meaningful set only: letters, numbers + minus,
// F1–F12, and the anchor keys. Odd punctuation/mod caps stay blank.
function kbLabel(k) {
  const named = {
    Escape: "esc", Tab: "tab", CapsLock: "caps", Enter: "return", Backspace: "delete",
    Shift: "shift",
  };
  if (named[k] !== undefined) return named[k];
  if (/^F\d+$/.test(k)) return k;
  if (/^[a-z0-9-]$/.test(k)) return k.toUpperCase();
  return ""; // everything else: blank caps
}

// novelty prints on the otherwise-blank caps — Market Bubble's glyph language
const KB_NOVELTY = {
  ",": ["\u25c0", "up"],
  ".": ["\u25b6", "dn"],
  "`": ["$"],
  "[": ["buy", "up"],
  "]": ["sell", "dn"],
  ";": ["rekt"],
  RShift: ["bullish"],
  Alt: ["bubl"],
  RAlt: ["live"],
  " ": ["invest in yourself", "brand"],
};

function KeyboardView({ onBack }) {
  const [text, setText] = React.useState("");
  const [down, setDown] = React.useState({});
  const dispRef = React.useRef(null);

  const flash = (id) => {
    setDown((d) => ({ ...d, [id]: true }));
    setTimeout(() => setDown((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    }), 130);
  };

  const keyId = (k, loc) => {
    const base = k.length === 1 ? k.toLowerCase() : k;
    if (loc === 2 && /^(Shift|Alt|Control|Meta)$/.test(base)) return "R" + base;
    return base;
  };

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") { onBack(); return; }
      e.preventDefault();
      MacSound.keyTap();
      flash(keyId(e.key, e.location));
      setText((cur) => {
        if (e.key === "Backspace") return cur.slice(0, -1);
        if (e.key === "Enter") return cur + "\n";
        if (e.key.length === 1) return (cur + e.key).slice(-400);
        return cur;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  React.useEffect(() => {
    const el = dispRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  const clickKey = (k) => {
    MacSound.keyTap();
    if (!k || k.startsWith("#")) return; // novelty caps: just the sound
    flash(k);
    setText((cur) => {
      if (k === "Backspace") return cur.slice(0, -1);
      if (k === "Enter") return cur + "\n";
      if (k.length === 1) return (cur + k).slice(-400);
      return cur;
    });
  };

  return (
    <React.Fragment>
      <button className="kb-back" onClick={() => { MacSound.close(); onBack(); }}>⤺ Back to desk</button>
      <div className="kbd-display" ref={dispRef}>
        {text || "type something…"}
        <span className="kbd-caret"></span>
      </div>
      <div className="kbdp">
        <img src="/keyboard.png" alt="Macintosh keyboard" draggable={false}></img>
        {/* silkscreened brand on the case plate */}
        <span className="kbdp-badge" aria-hidden="true">Market&nbsp;Bubble</span>
        {KB_LAYOUT.flat().map((c) => {
          const branded = c.k === "Meta" || c.k === "RMeta";
          const nov = KB_NOVELTY[c.k];
          const lbl = nov ? nov[0] : kbLabel(c.k);
          const noveltyCls = nov && nov[1] ? " " + nov[1] : "";
          return (
            <button
              key={`${c.k}-${c.x.toFixed(1)}`}
              className={`kbdp-key${down[c.k] ? " down" : ""}${lbl.length > 1 ? " mod" : ""}`}
              style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}
              tabIndex={-1}
              aria-label={c.k === " " ? "Space" : c.k}
              onPointerDown={() => clickKey(c.k)}
            >
              <span className={`kbdp-lbl${noveltyCls}`}>
                {branded ? <i className="kbdp-mark"></i> : lbl}
              </span>
            </button>
          );
        })}
      </div>
      <span className="kbd-hint">JUST TYPE — IT'S LOUD AND IT LOVES IT · ESC TO LEAVE</span>
    </React.Fragment>
  );
}

// the 2-second POST — era flavor before the Happy Mac
function RamCheck() {
  const LINES = [
    "MARKET BUBBLE SYSTEM 6.0.8",
    "TESTING RAM ........ 4,096K OK",
    "CHECKING DISK ...... BUBBLE HD OK",
    "CHECKING VIBES ..... IMMACULATE",
    "LOADING TAPE ....... OK",
  ];
  const [n, setN] = React.useState(1);
  React.useEffect(() => {
    const id = setInterval(() => setN((v) => Math.min(LINES.length, v + 1)), 330);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ramcheck">
      {LINES.slice(0, n).map((l) => (
        <div key={l}>{l}</div>
      ))}
      <span className="ram-cursor">█</span>
    </div>
  );
}

function MacApp() {
  const [view, setView] = React.useState("desk"); // desk | keyboard | watch
  const [boot, setBoot] = React.useState("off"); // off | flicker | happy | done
  const [lampOn, setLampOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(() => {
    try { return localStorage.getItem("mbmac.sound") !== "off"; } catch (e) { return true; }
  });
  const parallaxRef = React.useRef(null);
  const [flick, setFlick] = React.useState(false);

  // idle life: the CRT teaser shimmers every so often
  React.useEffect(() => {
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        setFlick(true);
        setTimeout(() => setFlick(false), 240);
        schedule();
      }, 9000 + Math.random() * 16000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    MacSound.setMuted(!soundOn);
    try { localStorage.setItem("mbmac.sound", soundOn ? "on" : "off"); } catch (e) {}
  }, [soundOn]);

  // cursor parallax on the desk
  React.useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    if (view !== "desk") { el.style.transform = ""; return; }
    const set = (nx, ny) => {
      el.style.transform = `scale(1.018) rotateX(${(-ny * 1.1).toFixed(2)}deg) rotateY(${(nx * 1.5).toFixed(2)}deg) translate3d(${(-nx * 2.5).toFixed(1)}px, ${(-ny * 1.8).toFixed(1)}px, 0)`;
    };
    const onMove = (e) => set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    const reset = () => set(0, 0);
    set(0, 0);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", reset);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", reset);
    };
  }, [view]);

  const bootUp = () => {
    setBoot("flicker");
    MacSound.startup();
    setTimeout(() => setBoot("ram"), 480);
    setTimeout(() => setBoot("happy"), 2500);
    setTimeout(() => setBoot("done"), 3550);
  };
  const enterWatch = () => {
    if (view === "watch") return;
    setView("watch");
    bootUp();
  };
  const eject = (how) => {
    if (how === "restart") {
      bootUp();
      return;
    }
    MacSound.close();
    setBoot("off");
    setView("desk");
  };

  return (
    <div className={`mac-root view-${view}${lampOn ? "" : " lamp-off"}`}>
      <div className="scene">
        {/* ---------- DESK ---------- */}
        <div className="desk-cam">
          <div className="desk-3d" ref={parallaxRef}>
            <img className="mac-photo" src="/mac.png" alt="A Macintosh on a desk" draggable={false}></img>

            {/* the screen — click to enter */}
            <button className="desk-screen" onClick={enterWatch} aria-label="Open Market Bubble">
              <div className={`desk-preview${flick ? " flick" : ""}`}>
                <div className="desk-mini-brand">
                  <RainbowMark size={76} />
                </div>
                <div className="desk-scan" aria-hidden="true"></div>
              </div>
              <div className="watch-cta">
                <span className="watch-dot"></span>
                <span className="line">Click to enter</span>
              </div>
              <div className="photo-glass" aria-hidden="true"></div>
            </button>

            <DeskProps onKeyboard={() => setView("keyboard")} lampOn={lampOn} setLampOn={setLampOn} active={view === "desk"} />

            {/* night falls when the lamp goes off */}
            <div className="room-dim" aria-hidden="true"></div>
          </div>
        </div>
        {view === "desk" && (
          <div className="desk-hint">PET THE CAT · PULL THE LAMP CHAIN · SIP THE COFFEE · DOUBLE-CLICK THE KEYBOARD</div>
        )}
      </div>

      {/* ---------- KEYBOARD ---------- */}
      <div className="kbd-layer" aria-hidden={view !== "keyboard"}>
        {view === "keyboard" && <KeyboardView onBack={() => setView("desk")} />}
      </div>

      {/* ---------- WATCH (the CRT) ---------- */}
      <div className="watch-layer" aria-hidden={view !== "watch"}>
        <div className="watch-crt">
          {boot !== "done" ? (
            <div className={`boot${boot === "flicker" ? " dark" : ""}`}>
              {boot === "flicker" && <span className="crt-on" aria-hidden="true"></span>}
              {boot === "ram" && (
                <div className="boot dark">
                  <RamCheck />
                </div>
              )}
              {boot === "happy" && (
                <div className="boot dark" style={{ display: "grid", placeItems: "center" }}>
                  <div className="boot-welcome">
                    <HappyMac />
                    <span>Welcome to Market&nbsp;Bubble</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            view === "watch" && (
              <Desktop
                onEject={eject}
                soundOn={soundOn}
                onToggleSound={() => setSoundOn((s) => !s)}
              />
            )
          )}
          <div className="watch-glass" aria-hidden="true"></div>
        </div>
      </div>

      <div className="mb-grain" aria-hidden="true"></div>
    </div>
  );
}


export { MacApp };
