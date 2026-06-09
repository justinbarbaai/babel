"use client";

import { useEffect, useState } from "react";

// This keyboard is mapped 1:1 to the real photo (/keyboard.png) — every key
// rect below was measured off the image (scanline edge detection), so each
// button renders exactly its keycap's pixels and presses in place. The photo
// is a non-standard 60% board, so the layout is "our own": a blank function
// row up top, then a slightly condensed QWERTY.
//
// [code, label, x1%, x2%] per key; rows carry their own y band.
type KeyTuple = [string, string, number, number];

const ROW_BANDS = [
  { top: 17.5, h: 12.15 }, // blank F-row
  { top: 30.4, h: 11.7 },  // numbers
  { top: 42.1, h: 11.8 },  // QWERTY
  { top: 53.9, h: 11.7 },  // home
  { top: 65.6, h: 11.7 },  // shift
  { top: 77.3, h: 11.7 },  // space
];

const ROW_KEYS: KeyTuple[][] = [
  // blank decorative F-row (physical F1–F12 still press them)
  [
    ["F1", "", 8.7, 12.9], ["F2", "", 14.2, 19.7], ["F3", "", 20.2, 24.4], ["F4", "", 25.9, 30.2], ["F5", "", 32.0, 36.0], ["F6", "", 37.5, 41.9], ["F7", "", 43.4, 47.7], ["F8", "", 49.1, 53.5], ["F9", "", 54.9, 59.3], ["F10", "", 62.7, 67.2], ["F11", "", 68.6, 73.1], ["F12", "", 74.5, 78.9], ["F13", "", 80.2, 84.7], ["F14", "", 86.0, 90.4],
  ],
  [
    ["Digit1", "1", 8.6, 12.9], ["Digit2", "2", 14.2, 18.7], ["Digit3", "3", 20.0, 24.6], ["Digit4", "4", 25.9, 30.6], ["Digit5", "5", 31.7, 36.4], ["Digit6", "6", 37.6, 42.3], ["Digit7", "7", 43.4, 48.2], ["Digit8", "8", 49.2, 54.1], ["Digit9", "9", 55.0, 59.9], ["Digit0", "0", 60.9, 65.7], ["Minus", "-", 66.9, 71.6], ["Equal", "=", 72.7, 77.4], ["Backspace", "delete", 79.5, 90.5],
  ],
  [
    ["Tab", "tab", 8.6, 15.7], ["KeyQ", "Q", 17.2, 21.7], ["KeyW", "W", 22.9, 27.6], ["KeyE", "E", 28.9, 33.5], ["KeyR", "R", 34.7, 39.5], ["KeyT", "T", 40.6, 45.3], ["KeyY", "Y", 46.5, 51.2], ["KeyU", "U", 52.3, 57.0], ["KeyI", "I", 58.1, 62.9], ["KeyO", "O", 64.0, 68.8], ["KeyP", "P", 69.8, 74.7], ["BracketLeft", "[", 75.7, 80.6], ["Backslash", "\\", 81.9, 90.6],
  ],
  [
    ["CapsLock", "caps", 8.5, 17.3], ["KeyA", "A", 18.7, 23.2], ["KeyS", "S", 24.6, 29.2], ["KeyD", "D", 30.4, 35.1], ["KeyF", "F", 36.3, 41.0], ["KeyG", "G", 42.1, 47.0], ["KeyH", "H", 48.0, 52.8], ["KeyJ", "J", 53.9, 58.7], ["KeyK", "K", 59.7, 64.6], ["KeyL", "L", 65.6, 70.4], ["Semicolon", ";", 71.5, 76.3], ["Enter", "return", 78.0, 90.7],
  ],
  [
    ["ShiftLeft", "shift", 8.5, 20.2], ["KeyZ", "Z", 21.8, 26.3], ["KeyX", "X", 27.5, 32.2], ["KeyC", "C", 33.4, 38.1], ["KeyV", "V", 39.2, 44.0], ["KeyB", "B", 45.1, 49.9], ["KeyN", "N", 50.9, 55.7], ["KeyM", "M", 56.7, 61.6], ["Comma", ",", 62.6, 67.5], ["Period", ".", 68.5, 73.4], ["ShiftRight", "shift", 75.4, 84.6], ["Slash", "/", 86.3, 90.7],
  ],
  [
    ["AltLeft", "opt", 14.4, 19.0], ["MetaLeft", "⌘", 21.2, 25.6], ["Space", "", 27.0, 63.1], ["MetaRight", "⌘", 65.1, 69.4], ["AltRight", "opt", 71.5, 75.9],
  ],
];

const MODS = new Set(["Backspace", "Tab", "CapsLock", "Enter", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

type KeySpec = { code: string; label: string; l: number; t: number; w: number; h: number; mod: boolean; blank: boolean };

const KEYS: KeySpec[] = ROW_KEYS.flatMap((row, ri) =>
  row.map(([code, label, x1, x2]) => ({
    code,
    label,
    l: x1,
    t: ROW_BANDS[ri].top,
    w: x2 - x1,
    h: ROW_BANDS[ri].h,
    mod: MODS.has(code),
    blank: ri === 0,
  }))
);

const ALL_CODES = new Set(KEYS.map((k) => k.code));

// pixel-press: each button shows exactly its keycap's patch of the photo, so at
// rest it's invisible and on press the real keycap sinks + darkens.
function keyStyle(k: KeySpec): React.CSSProperties {
  const W = k.w / 100;
  const H = k.h / 100;
  const L = k.l / 100;
  const T = k.t / 100;
  return {
    left: `${k.l}%`,
    top: `${k.t}%`,
    width: `${k.w}%`,
    height: `${k.h}%`,
    backgroundImage: "url(/keyboard.png)",
    backgroundSize: `${100 / W}% ${100 / H}%`,
    backgroundPosition: `${(L / (1 - W)) * 100}% ${(T / (1 - H)) * 100}%`,
  };
}

export function Keyboard({ onTap }: { onTap: () => void }) {
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());
  const [typed, setTyped] = useState("");

  const press = (code: string) => setPressed((p) => { const n = new Set(p); n.add(code); return n; });
  const release = (code: string) => setPressed((p) => { const n = new Set(p); n.delete(code); return n; });

  const append = (ch: string) => setTyped((t) => (t + ch).slice(-280));

  const onKeyMouse = (k: KeySpec) => {
    onTap();
    press(k.code);
    if (k.code === "Backspace") setTyped((t) => t.slice(0, -1));
    else if (k.code === "Enter") append("\n");
    else if (k.code === "Space") append(" ");
    else if (!k.mod && !k.blank && k.label.length === 1) append(/^[A-Z]$/.test(k.label) ? k.label.toLowerCase() : k.label);
    window.setTimeout(() => release(k.code), 110);
  };

  // physical keyboard → press the on-screen key + type + ASMR
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (ALL_CODES.has(e.code)) { e.preventDefault(); press(e.code); onTap(); }
      if (e.key === "Backspace") setTyped((t) => t.slice(0, -1));
      else if (e.key === "Enter") append("\n");
      else if (e.key.length === 1) append(e.key);
    };
    const up = (e: KeyboardEvent) => release(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onTap]);

  return (
    <div className="kbd">
      <div className="kbd-display">
        <span className="kbd-typed">{typed || "type on it — mouse or your real keyboard…"}</span>
        <span className="kbd-caret" />
      </div>
      <div className="kbdp">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kbdp-img" src="/keyboard.png" alt="Macintosh keyboard" draggable={false} />
        {KEYS.map((k) => (
          <button
            key={k.code}
            className={`kbdp-key ${k.mod ? "is-mod" : ""} ${pressed.has(k.code) ? "is-down" : ""}`}
            style={keyStyle(k)}
            onPointerDown={(e) => { e.preventDefault(); onKeyMouse(k); }}
          >
            {k.label && <span className="kbdp-lbl">{k.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
