"use client";

// A label + a list of channel inputs with add/remove, used by both the control
// panel and the pop-out reader to manage multiple Twitch/Kick channels.
export function ChannelList({
  label,
  values,
  onChange,
  onKeyDown,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
}) {
  const list = values.length ? values : [""];
  const setAt = (i: number, v: string) =>
    onChange(list.map((x, idx) => (idx === i ? v : x)));
  const add = () => onChange([...list, ""]);
  const removeAt = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="field">
      <label>{label}</label>
      {list.map((v, i) => (
        <div className="chan-row" key={i}>
          <input
            value={v}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            spellCheck={false}
          />
          {list.length > 1 && (
            <button
              className="chan-btn"
              onClick={() => removeAt(i)}
              title="Remove channel"
              aria-label="Remove channel"
            >
              –
            </button>
          )}
        </div>
      ))}
      <button className="chan-add" onClick={add}>
        + Add channel
      </button>
    </div>
  );
}
