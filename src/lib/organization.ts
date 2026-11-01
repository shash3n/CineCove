import type { Folder, TVShow, VideoEntry } from "../types";
export interface FolderLocation {
  folderId: string;
  path: string;
}
export function parentPath(path = "") {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}
export function inside(path: string, directory: string) {
  return !directory || path === directory || path.startsWith(directory + "/");
}
export function directoryPaths(folder: Folder, videos: VideoEntry[]) {
  const paths = new Set(["", ...(folder.paths || [])]);
  for (const v of videos.filter((v) => v.folderId === folder.id)) {
    const parts = parentPath(v.relativePath).split("/").filter(Boolean);
    parts.forEach((_, i) => paths.add(parts.slice(0, i + 1).join("/")));
  }
  return [...paths].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}
export function folderChildren(
  folder: Folder,
  videos: VideoEntry[],
  path: string,
) {
  return directoryPaths(folder, videos).filter(
    (p) => p !== path && parentPath(p) === path,
  );
}
export function episodeNumber(name: string) {
  const match = name.match(/(?:s\d+[ ._-]*e|\bepisode[ ._-]*|\be)(\d{1,3})/i);
  return match ? +match[1] : undefined;
}
export function episodeFor(v: VideoEntry, shows: TVShow[]) {
  if (v.showId)
    return {
      showId: v.showId,
      season: v.season ?? 1,
      episode: v.episode ?? episodeNumber(v.name),
    };
  const links = shows
    .flatMap((s) =>
      s.folders
        .filter(
          (f) =>
            f.folderId === v.folderId &&
            inside(parentPath(v.relativePath), f.path),
        )
        .map((f) => ({ ...f, showId: s.id })),
    )
    .sort((a, b) => b.path.length - a.path.length);
  return links[0]
    ? {
        showId: links[0].showId,
        season: links[0].season,
        episode: episodeNumber(v.name),
      }
    : undefined;
}
export function suggestedSeasons(
  folder: Folder,
  videos: VideoEntry[],
  path: string,
) {
  const children = folderChildren(folder, videos, path);
  const seasons = children
    .map((p) => {
      const match = p
        .split("/")
        .at(-1)!
        .match(/^(?:season[ ._-]*|s)(\d+)$/i);
      return match ? { folderId: folder.id, path: p, season: +match[1] } : null;
    })
    .filter((x) => x !== null);
  return seasons.length ? seasons : [{ folderId: folder.id, path, season: 1 }];
}
