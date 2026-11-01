import type { Preferences, Folder } from "../types";
import {
  FolderOpen,
  RefreshCw,
  Trash2,
  ShieldCheck,
  HardDrive,
  RotateCcw,
  Check,
  Palette,
  Play,
  Captions,
  Database,
} from "lucide-react";
import { useEffect, useState } from "react";
import { size } from "../lib/media";
export function SettingsPage({
  prefs,
  setPrefs,
  folders,
  onFolder,
  onRescan,
  onRemoveFolder,
  onClearThumbnails,
  onClearHistory,
  onReset,
  onClearLibrary,
  videoCount,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  folders: Folder[];
  onFolder: () => void;
  onRescan: (f: Folder) => void;
  onRemoveFolder: (f: Folder) => void;
  onClearThumbnails: () => void;
  onClearHistory: () => void;
  onReset: () => void;
  onClearLibrary: () => void;
  videoCount: number;
}) {
  const [usage, setUsage] = useState(0);
  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((x) => setUsage(x.usage || 0))
      .catch(() => {});
  }, []);
  const update = <K extends keyof Preferences>(key: K, val: Preferences[K]) =>
    setPrefs({ ...prefs, [key]: val });
  return (
    <div className="settings-page">
      <div className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>Settings</h1>
        <p>A few small details. A cinema that feels like you.</p>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>
            <Palette size={18} />
            Appearance
          </h2>
          <div className="setting-row">
            <div>
              <strong>Theme</strong>
              <p>Set the mood for your library.</p>
            </div>
            <select
              aria-label="Theme"
              value={prefs.theme}
              onChange={(e) =>
                update("theme", e.target.value as Preferences["theme"])
              }
            >
              <option value="dark">Midnight</option>
              <option value="light">Daylight</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Accent color</strong>
              <p>Your personal touch.</p>
            </div>
            <div className="color-choices">
              {(["violet", "blue", "mint"] as const).map((c) => (
                <button
                  key={c}
                  className={`swatch ${c}`}
                  aria-label={`${c} accent`}
                  aria-pressed={prefs.accent === c}
                  onClick={() => update("accent", c)}
                >
                  {prefs.accent === c && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            label="Compact library"
            hint="Fit more videos on your screen."
            value={prefs.compact}
            onChange={(v) => update("compact", v)}
          />
        </section>
        <section className="settings-card">
          <h2>
            <Play size={18} />
            Playback
          </h2>
          <div className="setting-row">
            <div>
              <strong>Default playback speed</strong>
              <p>New videos start at this speed.</p>
            </div>
            <select
              aria-label="Default speed"
              value={prefs.speed}
              onChange={(e) => update("speed", +e.target.value)}
            >
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Default volume</strong>
              <p>{Math.round(prefs.volume * 100)}%</p>
            </div>
            <input
              aria-label="Default volume"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={prefs.volume}
              onChange={(e) => update("volume", +e.target.value)}
            />
          </div>
          <Toggle
            label="Automatically resume"
            hint="Pick up exactly where you stopped."
            value={prefs.autoResume}
            onChange={(v) => update("autoResume", v)}
          />
        </section>
        <section className="settings-card">
          <h2>
            <Captions size={18} />
            Subtitles
          </h2>
          <div className="setting-row">
            <strong>Font size</strong>
            <select
              aria-label="Subtitle font size"
              value={prefs.subtitleSize}
              onChange={(e) => update("subtitleSize", +e.target.value)}
            >
              {[16, 20, 24, 28, 32, 40].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </div>
          <div className="setting-row">
            <strong>Default language</strong>
            <input
              className="short-input"
              aria-label="Default subtitle language"
              value={prefs.subtitleLanguage}
              onChange={(e) => update("subtitleLanguage", e.target.value)}
              placeholder="en"
              maxLength={12}
            />
          </div>
          <div className="setting-row">
            <strong>Text color</strong>
            <input
              aria-label="Subtitle color"
              type="color"
              value={prefs.subtitleColor}
              onChange={(e) => update("subtitleColor", e.target.value)}
            />
          </div>
          <div className="setting-row">
            <strong>Position</strong>
            <select
              aria-label="Subtitle position"
              value={prefs.subtitlePosition}
              onChange={(e) =>
                update("subtitlePosition", e.target.value as "top" | "bottom")
              }
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </select>
          </div>
          <Toggle
            label="Subtitle background"
            hint="Improve contrast over bright scenes."
            value={prefs.subtitleBackground}
            onChange={(v) => update("subtitleBackground", v)}
          />
        </section>
        <section className="settings-card">
          <h2>
            <FolderOpen size={18} />
            Library & folders
          </h2>
          <Toggle
            label="Generate thumbnails"
            hint="Extract a preview locally during import."
            value={prefs.thumbnails}
            onChange={(v) => update("thumbnails", v)}
          />
          <div className="setting-row">
            <strong>Default sorting</strong>
            <select
              aria-label="Default sorting"
              value={prefs.sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="added">Date added</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
              <option value="size">File size</option>
            </select>
          </div>
          <div className="folder-list">
            {folders.map((f) => (
              <div key={f.id}>
                <FolderOpen size={17} />
                <span>{f.name}</span>
                <button
                  className="icon-button"
                  onClick={() => onRescan(f)}
                  title="Reconnect and scan"
                  aria-label={`Reconnect ${f.name}`}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => onRemoveFolder(f)}
                  title="Forget folder link"
                  aria-label={`Forget ${f.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button className="button subtle" onClick={onFolder}>
            <FolderOpen size={16} />
            Add a folder
          </button>
          <p className="fine-print">
            Folder permissions may need approval again after reopening your
            browser. File input imports need reconnecting after reload.
          </p>
        </section>
        <section className="settings-card storage-card">
          <h2>
            <Database size={18} />
            Local storage
          </h2>
          <div className="storage-summary">
            <HardDrive size={23} />
            <div>
              <strong>{size(usage)} used on this device</strong>
              <p>{videoCount} library entries · Metadata and thumbnails only</p>
            </div>
            <span className="local-pill">LOCAL ONLY</span>
          </div>
          <div className="storage-buttons">
            <button
              className="button subtle danger-text"
              onClick={onClearLibrary}
            >
              <Trash2 size={15} />
              Clear entire library & imports
            </button>
            <button className="button subtle" onClick={onClearThumbnails}>
              <Trash2 size={15} />
              Clear thumbnails
            </button>
            <button className="button subtle" onClick={onClearHistory}>
              <RotateCcw size={15} />
              Clear playback history
            </button>
            <button className="text-button" onClick={onReset}>
              Reset preferences
            </button>
          </div>
          <p className="fine-print">
            Clearing browser site data removes your library metadata. Your
            original videos are never stored here or changed.
          </p>
        </section>
      </div>
      <div className="settings-privacy">
        <ShieldCheck size={21} />
        <div>
          <strong>Your collection is your business.</strong>
          <p>
            No accounts. No analytics. No media uploads. Even the compatibility
            engine runs on your device.
          </p>
        </div>
        <span>CINEVAULT 1.0</span>
      </div>
    </div>
  );
}
function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{hint}</p>
      </div>
      <button
        role="switch"
        aria-label={label}
        aria-checked={value}
        className={`toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
