import { validShortcuts } from "./shortcuts";
import {
  defaults,
  type VideoEntry,
  type Folder,
  type Playlist,
  type TVShow,
  type Preferences,
} from "../types";

export interface UserBackup {
  app: "CineVault";
  version: 1;
  videos: VideoEntry[];
  folders: Folder[];
  playlists: Playlist[];
  shows: TVShow[];
  preferences: Preferences;
}
const fail = () => {
  throw new Error(
    "This is not a valid CineVault v1 backup. No data was imported.",
  );
};
const string = (v: unknown): string =>
  typeof v === "string" && v.length <= 10000 ? v : fail();
const number = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fail();
const boolean = (v: unknown): boolean => (typeof v === "boolean" ? v : fail());
function records(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v) || v.length > 100000) return fail();
  const ids = new Set<string>();
  return v.map((r) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) return fail();
    const id = string(r.id);
    if (!id || ids.has(id)) return fail();
    ids.add(id);
    return r;
  });
}
export function parseBackup(source: string): UserBackup {
  const data = JSON.parse(source);
  if (!data || data.app !== "CineVault" || data.version !== 1) return fail();
  const videos = records(data.videos).map((r) => {
    const v = {
      id: string(r.id),
      name: string(r.name),
      format: string(r.format),
      favorite: boolean(r.favorite),
    } as VideoEntry;
    for (const key of [
      "size",
      "modified",
      "added",
      "duration",
      "width",
      "height",
      "position",
    ] as const)
      v[key] = number(r[key]);
    for (const key of [
      "lastPlayed",
      "speed",
      "sourceWidth",
      "sourceHeight",
      "season",
      "episode",
    ] as const)
      if (r[key] !== undefined) v[key] = number(r[key]);
    for (const key of ["completed", "continueHidden", "missing"] as const)
      if (r[key] !== undefined) v[key] = boolean(r[key]);
    for (const key of ["folderId", "relativePath", "showId"] as const)
      if (r[key] !== undefined) v[key] = string(r[key]);
    if (r.thumbnail !== undefined) {
      if (
        typeof r.thumbnail !== "string" ||
        r.thumbnail.length > 4000000 ||
        !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(
          r.thumbnail,
        )
      )
        return fail();
      v.thumbnail = r.thumbnail;
    }
    return v;
  });
  const folders = records(data.folders).map((r) => ({
    id: string(r.id),
    name: string(r.name),
    added: number(r.added),
    ...(r.ignoredIds !== undefined
      ? {
          ignoredIds: Array.isArray(r.ignoredIds)
            ? r.ignoredIds.map(string)
            : fail(),
        }
      : {}),
    ...(r.paths !== undefined
      ? { paths: Array.isArray(r.paths) ? r.paths.map(string) : fail() }
      : {}),
  }));
  const playlists = records(data.playlists).map((r) => ({
    id: string(r.id),
    name: string(r.name),
    videoIds: Array.isArray(r.videoIds) ? r.videoIds.map(string) : fail(),
  }));
  const shows = records(data.shows).map((r) => ({
    id: string(r.id),
    name: string(r.name),
    folders: Array.isArray(r.folders)
      ? r.folders.map((f) => ({
          folderId: string(f.folderId),
          path: string(f.path),
          season: number(f.season),
        }))
      : fail(),
  }));
  const preferences = { ...defaults };
  if (!data.preferences || typeof data.preferences !== "object") return fail();
  for (const key of Object.keys(defaults) as (keyof Preferences)[]) {
    const value = data.preferences[key];
    if (value === undefined) continue;
    if (key === "keyboardShortcuts" && !validShortcuts(value)) return fail();
    if (typeof value !== typeof defaults[key]) return fail();
    if (typeof value === "number") number(value);
    if (typeof value === "string") string(value);
    Object.assign(preferences, { [key]: value });
  }
  if (
    !["dark", "light"].includes(preferences.theme) ||
    !["violet", "blue", "mint"].includes(preferences.accent) ||
    preferences.volume > 1 ||
    preferences.speed < 0.25 ||
    preferences.speed > 3 ||
    preferences.subtitleSize < 8 ||
    preferences.subtitleSize > 100 ||
    preferences.subtitleOpacity > 1 ||
    preferences.subtitleBackgroundOpacity > 1 ||
    preferences.subtitleOffset > 40 ||
    !["none", "shadow", "outline", "raised"].includes(
      preferences.subtitleEdge,
    ) ||
    !["top", "bottom"].includes(preferences.subtitlePosition) ||
    !/^#[0-9a-f]{6}$/i.test(preferences.subtitleColor) ||
    !/^#[0-9a-f]{6}$/i.test(preferences.subtitleBackgroundColor)
  )
    return fail();
  return {
    app: "CineVault",
    version: 1,
    videos,
    folders,
    playlists,
    shows,
    preferences,
  };
}

export function serializeBackup(data: Omit<UserBackup, "app" | "version">) {
  // Browser permission handles are device-bound and cannot be exported.
  return JSON.stringify(
    { app: "CineVault", version: 1, ...data },
    (key, value) => (key === "handle" ? undefined : value),
    2,
  );
}
