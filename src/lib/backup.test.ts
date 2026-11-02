import { describe, it, expect } from "vitest";
import { parseBackup, serializeBackup } from "./backup";
import { defaults, type VideoEntry } from "../types";
const entry: VideoEntry = {
  id: "movie",
  name: "Film.mp4",
  size: 10,
  modified: 1,
  format: "mp4",
  added: 1,
  duration: 120,
  width: 1920,
  height: 1080,
  position: 42,
  favorite: true,
  handle: { kind: "file" } as FileSystemFileHandle,
};
const data = {
  videos: [entry],
  folders: [],
  playlists: [{ id: "p", name: "Weekend", videoIds: ["movie"] }],
  shows: [],
  preferences: defaults,
};
describe("portable user backups", () => {
  it("round-trips progress, favorites, collections and preferences without permissions", () => {
    const json = serializeBackup(data);
    expect(json).not.toContain('"handle"');
    const restored = parseBackup(json);
    expect(restored.videos[0].position).toBe(42);
    expect(restored.videos[0].favorite).toBe(true);
    expect(restored.playlists).toEqual(data.playlists);
    expect(restored.preferences).toEqual(defaults);
  });
  it("rejects malformed records and unsafe image URLs before import", () => {
    const source = JSON.parse(serializeBackup(data));
    source.videos[0].thumbnail = "https://tracker.invalid/image";
    expect(() => parseBackup(JSON.stringify(source))).toThrow();
    delete source.videos[0].thumbnail;
    source.videos.push(source.videos[0]);
    expect(() => parseBackup(JSON.stringify(source))).toThrow();
  });
  it("migrates older preferences with the default subtitle edge distance", () => {
    const source = JSON.parse(serializeBackup(data));
    delete source.preferences.subtitleOffset;
    expect(parseBackup(JSON.stringify(source)).preferences.subtitleOffset).toBe(
      4,
    );
  });
});
