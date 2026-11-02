import { expect, it } from "vitest";
import { validShortcuts, shortcutKey } from "./shortcuts";

it("rejects conflicting and invalid imported bindings", () => {
  expect(validShortcuts({})).toBe(true);
  expect(validShortcuts({ captions: "v" })).toBe(true);
  expect(validShortcuts({ captions: "m" })).toBe(false);
  expect(validShortcuts({ audio: "Escape" })).toBe(false);
  expect(validShortcuts({ audio: "CapsLock" })).toBe(false);
  expect(validShortcuts({ unknown: "v" })).toBe(false);
  expect(validShortcuts(null)).toBe(false);
});
it("ignores browser modifiers and normalizes letter keys", () => {
  const event = { key: "V", ctrlKey: false, metaKey: false, altKey: false };
  expect(shortcutKey(event)).toBe("v");
  expect(shortcutKey({ ...event, ctrlKey: true })).toBeNull();
  expect(shortcutKey({ ...event, key: "Escape" })).toBeNull();
  expect(shortcutKey({ ...event, key: "CapsLock" })).toBeNull();
});
