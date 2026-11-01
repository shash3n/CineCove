import type { Preferences } from "../types";
import { defaults } from "../types";
export function subtitleStyle(p: Preferences) {
  const rgba = (hex: string, opacity: number) => {
    const value = hex.replace("#", "");
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${opacity})`;
  };
  const edges = {
    none: "none",
    shadow: "0 2px 3px #000c",
    outline:
      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
    raised: "-1px -1px 0 #fff8, 1px 2px 1px #000",
  };
  return {
    "--subtitle-size": `${p.subtitleSize}px`,
    "--subtitle-color": rgba(p.subtitleColor, p.subtitleOpacity),
    "--subtitle-bg": p.subtitleBackground
      ? rgba(p.subtitleBackgroundColor, p.subtitleBackgroundOpacity)
      : "transparent",
    "--subtitle-font": p.subtitleFont,
    "--subtitle-edge": edges[p.subtitleEdge],
  } as React.CSSProperties;
}
export function SubtitleAppearance({
  prefs: p,
  setPrefs,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
}) {
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs({ ...p, [key]: value });
  return (
    <div className="subtitle-appearance">
      <label className="player-setting">
        Font family
        <select
          aria-label="Subtitle font family"
          value={p.subtitleFont}
          onChange={(e) => update("subtitleFont", e.target.value)}
        >
          {[
            "sans-serif",
            "serif",
            "monospace",
            "Arial",
            "Georgia",
            "Verdana",
            "Trebuchet MS",
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="player-setting">
        Text opacity
        <input
          aria-label="Subtitle text opacity"
          type="range"
          min="0"
          max="1"
          step=".05"
          value={p.subtitleOpacity}
          onChange={(e) => update("subtitleOpacity", +e.target.value)}
        />
        <span>{Math.round(p.subtitleOpacity * 100)}%</span>
      </label>
      <label className="player-setting">
        Character edge
        <select
          aria-label="Subtitle character edge"
          value={p.subtitleEdge}
          onChange={(e) =>
            update(
              "subtitleEdge",
              e.target.value as Preferences["subtitleEdge"],
            )
          }
        >
          {["none", "shadow", "outline", "raised"].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="player-setting">
        Background color
        <input
          aria-label="Subtitle background color"
          type="color"
          value={p.subtitleBackgroundColor}
          onChange={(e) => update("subtitleBackgroundColor", e.target.value)}
        />
      </label>
      <label className="player-setting">
        Background opacity
        <input
          aria-label="Subtitle background opacity"
          type="range"
          min="0"
          max="1"
          step=".05"
          value={p.subtitleBackgroundOpacity}
          onChange={(e) => update("subtitleBackgroundOpacity", +e.target.value)}
        />
        <span>{Math.round(p.subtitleBackgroundOpacity * 100)}%</span>
      </label>
      <div className="subtitle-style-preview" style={subtitleStyle(p)}>
        <span>Your story. Your subtitles.</span>
      </div>
      <button
        className="button subtle"
        onClick={() => {
          const keys = (Object.keys(defaults) as (keyof Preferences)[]).filter(
            (k) => k.startsWith("subtitle") && k !== "subtitleLanguage",
          );
          const reset = { ...p };
          keys.forEach((k) => Object.assign(reset, { [k]: defaults[k] }));
          setPrefs(reset);
        }}
      >
        Reset subtitle appearance
      </button>
    </div>
  );
}
