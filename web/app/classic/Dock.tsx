"use client";

import { useState, type ReactNode } from "react";

export type DockItem = {
  key: string;
  label: string;
  glyph: ReactNode;
  open?: boolean;
  onClick: () => void;
};

// Aqua-style dock: glossy gel tiles that magnify on hover and bounce on launch.
export function Dock({ items }: { items: DockItem[] }) {
  const [bounce, setBounce] = useState<string | null>(null);
  return (
    <div className="dock">
      <div className="dock-tray">
        {items.map((it) => (
          <button
            key={it.key}
            className={`dock-item ${it.open ? "is-open" : ""} ${bounce === it.key ? "bounce" : ""}`}
            title={it.label}
            onClick={() => {
              it.onClick();
              setBounce(it.key);
              window.setTimeout(() => setBounce((b) => (b === it.key ? null : b)), 720);
            }}
          >
            <span className="dock-tip">{it.label}</span>
            <span className="dock-tile">{it.glyph}</span>
            <span className="dock-run" />
          </button>
        ))}
      </div>
    </div>
  );
}
