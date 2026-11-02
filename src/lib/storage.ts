import type {
  VideoEntry,
  Playlist,
  Folder,
  Preferences,
  TVShow,
} from "../types";
import { defaults } from "../types";
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    let blocked = false;
    const req = indexedDB.open("cinevault", 2);
    req.onupgradeneeded = () => {
      for (const name of ["videos", "playlists", "folders", "shows"])
        if (!req.result.objectStoreNames.contains(name))
          req.result.createObjectStore(name, { keyPath: "id" });
    };
    req.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Close other CineVault tabs, then reload to finish updating your local library. Your saved entries are kept.",
        ),
      );
    };
    req.onsuccess = () => {
      if (blocked) {
        req.result.close();
        return;
      }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () =>
      reject(
        new Error(
          "Local storage is unavailable. Allow site storage to save your library.",
        ),
      );
  }));
}
async function readAll<T>(store: string): Promise<T[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function write(store: string, value: unknown, remove = false) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    const s = tx.objectStore(store);
    if (remove) s.delete(value as string);
    else s.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export const storage = {
  mergeBackup: async (data: {
    videos: VideoEntry[];
    folders: Folder[];
    playlists: Playlist[];
    shows: TVShow[];
  }) => {
    const d = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(
        ["videos", "folders", "playlists", "shows"],
        "readwrite",
      );
      for (const name of ["videos", "folders", "playlists", "shows"] as const)
        for (const record of data[name]) tx.objectStore(name).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  },
  clearLibrary: async () => {
    const d = await db();
    return new Promise<void>((resolve, reject) => {
      const names = ["videos", "folders", "playlists", "shows"];
      const tx = d.transaction(names, "readwrite");
      names.forEach((n) => tx.objectStore(n).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },
  videos: () => readAll<VideoEntry>("videos"),
  playlists: () => readAll<Playlist>("playlists"),
  folders: () => readAll<Folder>("folders"),
  shows: () => readAll<TVShow>("shows"),
  saveShow: (s: TVShow) => write("shows", s),
  removeShow: (id: string) => write("shows", id, true),
  saveVideo: (v: VideoEntry) => write("videos", v),
  removeVideo: (id: string) => write("videos", id, true),
  savePlaylist: (p: Playlist) => write("playlists", p),
  removePlaylist: (id: string) => write("playlists", id, true),
  saveFolder: (f: Folder) => write("folders", f),
  removeFolder: (id: string) => write("folders", id, true),
};
export function loadPreferences(): Preferences {
  try {
    return {
      ...defaults,
      ...JSON.parse(localStorage.getItem("cinevault.preferences") || "{}"),
    };
  } catch {
    return defaults;
  }
}
export function savePreferences(p: Preferences) {
  localStorage.setItem("cinevault.preferences", JSON.stringify(p));
}
