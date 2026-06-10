"use client";

import {
  FONT_OPTIONS,
  type LookOptions,
  type BadgeStyle,
  type BgStyle,
  type ChatSkin,
  type FontSize,
  type NameColor,
  type AccountColor,
  type FontChoice,
} from "../lib/overlay";

// The shared chat-appearance controls, used by both the overlay studio and the
// watch dashboard's settings drawer so the two never drift.
export function StyleControls({
  value,
  onChange,
}: {
  value: LookOptions;
  onChange: (patch: Partial<LookOptions>) => void;
}) {
  return (
    <>
      {/* "Market Bubble" is a preset: it also switches the font to the brand
          serif, but never touches your Name color — pick that yourself below. */}
      <Segmented<ChatSkin>
        label="Chat style"
        value={value.skin ?? "twitch"}
        onChange={(skin) =>
          onChange(
            skin === "paper" ? { skin, font: "mb" } : skin === "twitch" ? { skin, font: "inter" } : { skin }
          )
        }
        options={[
          ["twitch", "Twitch"],
          ["default", "Standard"],
          ["paper", "Market Bubble"],
        ]}
      />

      <div className="selectfield">
        <span className="segmented-label">Chat font</span>
        <div className="select-wrap">
          <select
            className="select"
            value={value.font}
            onChange={(e) => onChange({ font: e.target.value as FontChoice })}
          >
            {FONT_OPTIONS.map(([val, text]) => (
              <option key={val} value={val}>
                {text}
              </option>
            ))}
          </select>
          <span className="select-caret" aria-hidden>
            ▾
          </span>
        </div>
      </div>

      <Segmented<BadgeStyle>
        label="Badge"
        value={value.badge}
        onChange={(badge) => onChange({ badge })}
        options={[
          ["full", "Logo + name"],
          ["channel", "Logo + channel"],
          ["logo", "Logo only"],
          ["text", "Name only"],
          ["dot", "Color dot"],
        ]}
      />

      <Segmented<NameColor>
        label="Name color"
        value={value.nameColor}
        onChange={(nameColor) => onChange({ nameColor })}
        options={[
          ["chatter", "Their color"],
          ["platform", "Platform"],
          ["white", "White"],
        ]}
      />

      <Segmented<AccountColor>
        label="Account name color (Logo + channel badge)"
        value={value.accountColor}
        onChange={(accountColor) => onChange({ accountColor })}
        options={[
          ["white", "White"],
          ["platform", "Platform"],
        ]}
      />

      <Segmented<BgStyle>
        label="Background behind text"
        value={value.bg}
        onChange={(bg) => onChange({ bg })}
        options={[
          ["box", "Boxes"],
          ["glass", "Glass"],
          ["none", "None"],
        ]}
      />

      <Segmented<FontSize>
        label="Text size"
        value={value.size}
        onChange={(size) => onChange({ size })}
        options={[
          ["sm", "Small"],
          ["md", "Medium"],
          ["lg", "Large"],
        ]}
      />

      <label className="toggle">
        <input
          type="checkbox"
          checked={value.shadow}
          onChange={(e) => onChange({ shadow: e.target.checked })}
        />
        <span>Text shadow (readability over gameplay)</span>
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={value.timestamps}
          onChange={(e) => onChange({ timestamps: e.target.checked })}
        />
        <span>Show timestamps</span>
      </label>
    </>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex(([val]) => val === value)
  );
  return (
    <div className="segmented">
      <span className="segmented-label">{label}</span>
      <div className="segmented-track" style={{ ["--seg-count" as any]: options.length }}>
        <span
          className="seg-thumb"
          style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
        />
        {options.map(([val, text]) => (
          <button
            key={val}
            className={`seg ${value === val ? "active" : ""}`}
            onClick={() => onChange(val)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
