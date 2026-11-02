import { useState } from "react";
import type { Preferences } from "../types";
import {
  shortcutDefaults,
  shortcutLabels,
  shortcutKey,
  keyLabel,
  type ShortcutAction,
} from "../lib/shortcuts";
import { Modal } from "./UI";

export function KeyboardShortcuts({
  prefs,
  setPrefs,
  onClose,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const bindings = { ...shortcutDefaults, ...prefs.keyboardShortcuts };
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className="dialog-body shortcut-editor">
        <p>
          Click a key field and press a new key. Changes are saved
          automatically. Escape closes menus or exits fullscreen.
        </p>
        <p className="shortcut-feedback" role="status">
          {message || "Use individual keys without Ctrl, Alt, or Command."}
        </p>
        <div className="shortcut-key-list">
          {(Object.keys(shortcutDefaults) as ShortcutAction[]).map((action) => (
            <label className="shortcut-key-row" key={action}>
              <span>{shortcutLabels[action]}</span>
              <input
                aria-label={`Shortcut for ${shortcutLabels[action]}`}
                readOnly
                value={keyLabel(bindings[action])}
                onKeyDown={(event) => {
                  if (event.key === "Tab" || event.key === "Escape") return;
                  event.preventDefault();
                  event.stopPropagation();
                  const key = shortcutKey(event);
                  if (!key) {
                    setMessage(
                      "Choose a single key without Ctrl, Alt, or Command.",
                    );
                    return;
                  }
                  const duplicate = (
                    Object.keys(bindings) as ShortcutAction[]
                  ).find(
                    (other) => other !== action && bindings[other] === key,
                  );
                  if (duplicate) {
                    setMessage(
                      `${keyLabel(key)} is already used for ${shortcutLabels[duplicate].toLowerCase()}.`,
                    );
                    return;
                  }
                  setPrefs({
                    ...prefs,
                    keyboardShortcuts: {
                      ...prefs.keyboardShortcuts,
                      [action]: key,
                    },
                  });
                  setMessage(
                    `${shortcutLabels[action]} saved as ${keyLabel(key)}.`,
                  );
                }}
              />
            </label>
          ))}
        </div>
        <div className="playlist-picker-footer">
          <button
            className="button subtle"
            onClick={() => {
              setPrefs({ ...prefs, keyboardShortcuts: {} });
              setMessage("Default shortcuts restored.");
            }}
          >
            Reset shortcuts
          </button>
          <button className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
