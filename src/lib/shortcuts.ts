export const shortcutDefaults = {
  play: " ",
  playAlt: "k",
  back: "ArrowLeft",
  forward: "ArrowRight",
  backLarge: "j",
  forwardLarge: "l",
  volumeUp: "ArrowUp",
  volumeDown: "ArrowDown",
  mute: "m",
  fullscreen: "f",
  audio: "a",
  captions: "c",
  start: "Home",
  end: "End",
  frameBack: ",",
  frameForward: ".",
  help: "?",
};
export type ShortcutAction = keyof typeof shortcutDefaults;
const namedKey =
  /^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown|Enter|Backspace|Delete|Insert|F([1-9]|1[0-2]))$/;
export const shortcutLabels: Record<ShortcutAction, string> = {
  play: "Play / pause",
  playAlt: "Play / pause (alternate)",
  back: "Seek back 5 seconds",
  forward: "Seek forward 5 seconds",
  backLarge: "Seek back 10 seconds",
  forwardLarge: "Seek forward 10 seconds",
  volumeUp: "Volume up",
  volumeDown: "Volume down",
  mute: "Mute / unmute",
  fullscreen: "Fullscreen",
  audio: "Audio tracks",
  captions: "Toggle captions",
  start: "Beginning",
  end: "End",
  frameBack: "Previous frame",
  frameForward: "Next frame",
  help: "Keyboard shortcuts",
};
export function shortcutKey(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
) {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    ["Control", "Meta", "Alt", "Shift", "Escape", "Tab"].includes(event.key)
  )
    return null;
  if (event.key.length === 1) return event.key.toLowerCase();
  return namedKey.test(event.key) ? event.key : null;
}
export function keyLabel(key: string) {
  return (
    (
      {
        " ": "Space",
        ArrowLeft: "←",
        ArrowRight: "→",
        ArrowUp: "↑",
        ArrowDown: "↓",
      } as Record<string, string>
    )[key] || (key.length === 1 ? key.toUpperCase() : key)
  );
}
export function validShortcuts(
  value: unknown,
): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const merged = { ...shortcutDefaults, ...value };
  return (
    Object.entries(value).every(
      ([action, key]) =>
        Object.hasOwn(shortcutDefaults, action) &&
        typeof key === "string" &&
        ((key.length === 1 && key === key.toLowerCase()) || namedKey.test(key)),
    ) && new Set(Object.values(merged)).size === Object.keys(merged).length
  );
}
