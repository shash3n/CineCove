import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  FolderOpen,
  ShieldCheck,
  HardDrive,
  Clapperboard,
  ArrowUpRight,
  Upload,
  X,
  Play,
  Heart,
  ListVideo,
  Sparkles,
  CircleHelp,
  RefreshCw,
} from "lucide-react";
import type {
  VideoEntry,
  Playlist,
  Folder,
  Page,
  Preferences,
  TVShow,
} from "./types";
import type { FolderLocation } from "./lib/organization";
import { parentPath, episodeFor } from "./lib/organization";
import { FolderBrowser } from "./components/FolderBrowser";
import { TVShows, ShowEditor, EpisodeEditor } from "./components/TVShows";
import { defaults } from "./types";
import { storage, loadPreferences, savePreferences } from "./lib/storage";
import {
  accept,
  isVideo,
  describeFile,
  fileId,
  inspectFile,
  walkFolder,
  size,
  resolution,
} from "./lib/media";
import { AppSidebar, TopNavigation } from "./components/Navigation";
import {
  Hero,
  VideoLibrary,
  VideoDetails,
  PlaylistManager,
  ContinueWatching,
  RecentlyPlayed,
} from "./components/Library";
import type { LibraryActions } from "./components/Library";
import { ImportDialog } from "./components/ImportDialog";
import { SettingsPage } from "./components/SettingsPage";
import VideoPlayer from "./components/VideoPlayer";
import { EpisodeBrowser } from "./components/EpisodeBrowser";
import {
  Modal,
  ToastNotifications,
  LoadingIndicator,
  ErrorDialog,
} from "./components/UI";
type Notice = { id: number; text: string; error?: boolean };
export default function App() {
  const [videos, setVideos] = useState<VideoEntry[]>([]),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [shows, setShows] = useState<TVShow[]>([]),
    [folderLocation, setFolderLocation] = useState<FolderLocation | null>(null),
    [showEditor, setShowEditor] = useState<{
      show?: TVShow;
      source?: FolderLocation;
    } | null>(null),
    [episodeEditor, setEpisodeEditor] = useState<VideoEntry | null>(null),
    [prefs, setPrefsState] = useState(loadPreferences),
    [page, setPageState] = useState<Page>("Home"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState(prefs.sort),
    [format, setFormat] = useState(""),
    [res, setRes] = useState(""),
    [view, setView] = useState<"grid" | "list">("grid"),
    [sidebar, setSidebar] = useState(false),
    [importDialog, setImportDialog] = useState(false),
    [loading, setLoading] = useState(true),
    [importing, setImporting] = useState(""),
    [dragging, setDragging] = useState(false),
    [toasts, setToasts] = useState<Notice[]>([]),
    [error, setError] = useState(""),
    [details, setDetails] = useState<VideoEntry | null>(null),
    [player, setPlayer] = useState<{ id: string; file: File } | null>(null),
    [reconnect, setReconnect] = useState<VideoEntry | null>(null),
    [playlistForm, setPlaylistForm] = useState<{
      kind: "create" | "rename" | "add";
      playlist?: Playlist;
      video?: VideoEntry;
    } | null>(null),
    [playlistName, setPlaylistName] = useState(""),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: () => void;
    } | null>(null),
    [help, setHelp] = useState(false);
  const files = useRef(new Map<string, File>()),
    entries = useRef(videos),
    importLock = useRef(false),
    individualInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null),
    reconnectInput = useRef<HTMLInputElement>(null),
    dragCount = useRef(0),
    toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  entries.current = videos;
  const notify = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, error }]);
    toastTimers.current.push(
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000),
    );
  }, []);
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    let active = true;
    Promise.all([
      storage.videos(),
      storage.playlists(),
      storage.folders(),
      storage.shows(),
    ])
      .then(([v, p, f, s]) => {
        if (active) {
          entries.current = v;
          setVideos(v);
          setPlaylists(p);
          setFolders(f);
          setShows(s);
        }
      })
      .catch((e) => notify(e.message, true))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notify]);
  const persist = useCallback(
    (v: VideoEntry) =>
      storage
        .saveVideo(v)
        .catch(() =>
          notify(
            "Could not save library metadata. Check available browser storage.",
            true,
          ),
        ),
    [notify],
  );
  const update = useCallback(
    (id: string, patch: Partial<VideoEntry>) => {
      const old = entries.current.find((v) => v.id === id);
      if (!old) return;
      const v = { ...old, ...patch };
      entries.current = entries.current.map((x) => (x.id === id ? v : x));
      setVideos(entries.current);
      void persist(v);
    },
    [persist],
  );
  const setPrefs = useCallback(
    (p: Preferences) => {
      setPrefsState(p);
      try {
        savePreferences(p);
      } catch {
        notify("Preferences could not be saved in this browser.", true);
      }
    },
    [notify],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.accent = prefs.accent;
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon)
      icon.href =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#171b23"/><path d="M44 19a19 19 0 1 0 0 26" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><path d="m29 23 15 9-15 9z" fill="${accent}"/></svg>`,
        );
  }, [prefs.theme, prefs.accent]);
  useEffect(() => setSort(prefs.sort), [prefs.sort]);
  const setPage = (p: Page) => {
    setPageState(p);
    setFolderLocation(null);
    setSearch("");
    setFormat("");
    setRes("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target as HTMLElement).closest("input,textarea,select") &&
        !player
      ) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search-bar input")?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [player]);
  async function importEntries(
    source:
      | AsyncIterable<{
          file: File;
          handle?: FileSystemFileHandle;
          relativePath?: string;
        }>
      | { file: File; handle?: FileSystemFileHandle; relativePath?: string }[],
    folderId?: string,
  ) {
    if (importLock.current) {
      notify("An import is already running. Please wait.");
      return;
    }
    importLock.current = true;
    let added = 0,
      connected = 0,
      skipped = 0;
    setImportDialog(false);
    setImporting("Reading your collection…");
    try {
      for await (const { file, handle, relativePath } of source) {
        if (!isVideo(file)) {
          skipped++;
          continue;
        }
        const id = fileId(file);
        files.current.set(id, file);
        const old = entries.current.find((v) => v.id === id);
        if (old) {
          connected++;
          if (handle || folderId)
            update(id, {
              ...(handle ? { handle } : {}),
              folderId: folderId || old.folderId,
              ...(relativePath ? { relativePath } : {}),
            });
          if (!old.thumbnail && old.width > 0 && prefs.thumbnails) {
            setImporting(`Refreshing preview · ${file.name}`);
            update(id, await inspectFile(file, true));
          }
          continue;
        }
        const entry = {
          ...describeFile(file),
          ...(handle ? { handle } : {}),
          ...(folderId ? { folderId } : {}),
          ...(relativePath ? { relativePath } : {}),
        };
        entries.current = [entry, ...entries.current];
        setVideos(entries.current);
        await persist(entry);
        added++;
        setImporting(
          `Importing ${added} ${added === 1 ? "video" : "videos"} · ${file.name}`,
        );
        const metadata = await inspectFile(file, prefs.thumbnails);
        update(id, metadata);
      }
      notify(
        added
          ? `${added} ${added === 1 ? "video added" : "videos added"} to your library.${connected ? ` ${connected} reconnected.` : ""}`
          : connected
            ? `${connected} ${connected === 1 ? "video" : "videos"} reconnected.`
            : skipped
              ? "No supported video files found."
              : "This folder contains no recognized video files.",
      );
    } catch (e) {
      setError(
        `Some files could not be read. ${(e as Error).message} Check folder permissions and that your drive is connected. Videos already imported are available.`,
      );
    } finally {
      importLock.current = false;
      setImporting("");
    }
  }
  async function chooseFiles() {
    setImportDialog(false);
    if ("showOpenFilePicker" in window) {
      try {
        const handles: FileSystemFileHandle[] = await (
          window as any
        ).showOpenFilePicker({
          multiple: true,
          types: [
            { description: "Videos", accept: { "video/*": accept.split(",") } },
          ],
        });
        const selected = await Promise.all(
          handles.map(async (handle) => ({
            file: await handle.getFile(),
            handle,
          })),
        );
        await importEntries(selected);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          notify(
            "File selection was unavailable. Use the standard file browser.",
          );
          individualInput.current?.click();
        }
      }
    } else individualInput.current?.click();
  }
  async function chooseFolder() {
    setImportDialog(false);
    if ("showDirectoryPicker" in window) {
      try {
        const handle: FileSystemDirectoryHandle = await (
          window as any
        ).showDirectoryPicker({ mode: "read" });
        let folder: Folder | undefined;
        for (const f of folders) {
          if (f.handle && (await f.handle.isSameEntry(handle))) {
            folder = f;
            break;
          }
          if (!f.handle && f.name === handle.name) folder = f;
        }
        folder = {
          id: folder?.id || crypto.randomUUID(),
          name: handle.name,
          handle,
          added: Date.now(),
        };
        await storage.saveFolder(folder);
        const next = [...folders.filter((f) => f.id !== folder!.id), folder];
        setFolders(next);
        const paths: string[] = [];
        await importEntries(
          walkFolder(handle, "", (p) => paths.push(p)),
          folder.id,
        );
        folder = { ...folder, paths };
        await storage.saveFolder(folder);
        setFolders((prev) =>
          prev.map((f) => (f.id === folder!.id ? folder! : f)),
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          setError(
            "Folder access was denied or the folder could not be read. Try importing individual files, or allow read permission when prompted.",
          );
      }
    } else folderInput.current?.click();
  }
  async function rescan(folder: Folder) {
    if (!folder.handle) {
      folderInput.current?.click();
      return;
    }
    try {
      const result = await (folder.handle as any).requestPermission({
        mode: "read",
      });
      if (result !== "granted") throw new Error("Permission denied");
      const paths: string[] = [];
      await importEntries(
        walkFolder(folder.handle, "", (p) => paths.push(p)),
        folder.id,
      );
      const refreshed = { ...folder, paths };
      await storage.saveFolder(refreshed);
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? refreshed : f)),
      );
    } catch {
      setError(
        "Folder access was not granted. Reconnect the folder with “Add a folder” and approve read permission.",
      );
    }
  }
  async function play(v: VideoEntry) {
    let file = files.current.get(v.id);
    if (!file && v.handle) {
      try {
        const permission = await (v.handle as any).requestPermission({
          mode: "read",
        });
        if (permission !== "granted") throw new Error("Permission denied");
        file = await v.handle.getFile();
        if (file.size !== v.size || file.lastModified !== v.modified) {
          notify(
            "This file has changed. Import it again to refresh its library entry.",
            true,
          );
          return;
        }
        files.current.set(v.id, file);
      } catch {
        setReconnect(v);
        return;
      }
    }
    if (!file) {
      setReconnect(v);
      return;
    }
    update(v.id, { continueHidden: false });
    setPlayer({ id: v.id, file });
  }
  async function importFolderInput(selected: File[]) {
    if (!selected.length) return;
    const name =
      selected[0].webkitRelativePath.split("/")[0] || "Imported folder";
    const existing = folders.find((f) => !f.handle && f.name === name);
    const paths = new Set<string>([""]);
    const source = selected.map((file) => {
      const relativePath =
        file.webkitRelativePath.split("/").slice(1).join("/") || file.name;
      const parts = parentPath(relativePath).split("/").filter(Boolean);
      parts.forEach((_, i) => paths.add(parts.slice(0, i + 1).join("/")));
      return { file, relativePath };
    });
    const folder: Folder = {
      id: existing?.id || crypto.randomUUID(),
      name,
      added: existing?.added || Date.now(),
      paths: [...paths],
    };
    await storage.saveFolder(folder);
    setFolders((prev) => [...prev.filter((f) => f.id !== folder.id), folder]);
    await importEntries(source, folder.id);
  }
  function saveShow(show: TVShow) {
    const conflict = show.folders.find((link) =>
      shows.some(
        (s) =>
          s.id !== show.id &&
          s.folders.some(
            (f) => f.folderId === link.folderId && f.path === link.path,
          ),
      ),
    );
    if (conflict) {
      notify(
        "That exact season folder already belongs to another show. Edit or remove its previous mapping first.",
        true,
      );
      return false;
    }
    setShows((prev) => [...prev.filter((s) => s.id !== show.id), show]);
    storage
      .saveShow(show)
      .catch(() => notify("TV show could not be saved.", true));
    return true;
  }
  function clearContinue() {
    setConfirm({
      title: "Clear Continue Watching?",
      message:
        "Hide all in-progress videos from Continue Watching. Saved resume positions and original files are kept. Playing a video again brings it back.",
      action: () => {
        entries.current
          .filter((v) => v.position > 0 && !v.completed && !v.continueHidden)
          .forEach((v) => update(v.id, { continueHidden: true }));
        notify("Continue Watching cleared. Resume positions kept.");
      },
    });
  }
  function savePlaylist(p: Playlist) {
    setPlaylists((prev) => [...prev.filter((x) => x.id !== p.id), p]);
    storage
      .savePlaylist(p)
      .catch(() => notify("Playlist could not be saved.", true));
  }
  const createPlaylist = () => {
    setPlaylistName("");
    setPlaylistForm({ kind: "create" });
  };
  const remove = (v: VideoEntry) =>
    setConfirm({
      title: "Remove from your library?",
      message: `“${v.name}” will be removed from CineVault. Your original file stays on your device.`,
      action: () => {
        entries.current = entries.current.filter((x) => x.id !== v.id);
        setVideos(entries.current);
        files.current.delete(v.id);
        storage
          .removeVideo(v.id)
          .catch(() => notify("Could not remove saved entry.", true));
        playlists
          .filter((p) => p.videoIds.includes(v.id))
          .forEach((p) =>
            savePlaylist({
              ...p,
              videoIds: p.videoIds.filter((id) => id !== v.id),
            }),
          );
        notify("Video removed. Original file untouched.");
      },
    });
  const selectedPlaylist = page.startsWith("playlist:")
    ? playlists.find((p) => `playlist:${p.id}` === page)
    : undefined;
  const actions: LibraryActions = {
    play,
    favorite: (v) => update(v.id, { favorite: !v.favorite }),
    remove,
    details: setDetails,
    playlist: (v) => setPlaylistForm({ kind: "add", video: v }),
    removeContinue: (v) => {
      update(v.id, { continueHidden: true });
      notify("Removed from Continue Watching. Resume position kept.");
    },
    organizeEpisode: setEpisodeEditor,
    customThumbnail: async (v, file) => {
      if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
        notify("Choose an image under 15 MB.", true);
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 480;
        c.height = Math.round((480 * img.height) / img.width);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        update(v.id, { thumbnail: c.toDataURL("image/jpeg", 0.8) });
        notify("Thumbnail updated.");
      } catch {
        notify("This image could not be read.", true);
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    ...(selectedPlaylist
      ? {
          removeFromPlaylist: (v: VideoEntry) =>
            savePlaylist({
              ...selectedPlaylist,
              videoIds: selectedPlaylist.videoIds.filter((id) => id !== v.id),
            }),
        }
      : {}),
  };
  let collection = videos.filter((v) =>
    page === "Favorites"
      ? v.favorite
      : page === "Recently Played"
        ? !!v.lastPlayed
        : page === "Continue Watching"
          ? v.position > 0 && !v.completed && !v.continueHidden
          : selectedPlaylist
            ? selectedPlaylist.videoIds.includes(v.id)
            : (page === "Home" || page === "All Videos") && !search
              ? folderLocation
                ? v.folderId === folderLocation.folderId &&
                  parentPath(v.relativePath) === folderLocation.path
                : true
              : true,
  );
  const collectionCount = collection.length;
  collection = collection
    .filter(
      (v) =>
        v.name.toLowerCase().includes(search.toLowerCase()) &&
        (!format || v.format === format) &&
        (!res ||
          (res === "SD"
            ? (v.sourceHeight || v.height) > 0 &&
              !["4K", "1080p", "720p"].includes(resolution(v))
            : res === "unknown"
              ? !(v.sourceHeight || v.height)
              : resolution(v) === res)),
    )
    .sort((a, b) =>
      page === "Recently Played"
        ? (b.lastPlayed || 0) - (a.lastPlayed || 0)
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "duration"
            ? b.duration - a.duration
            : sort === "size"
              ? b.size - a.size
              : b.added - a.added,
    );
  const continuing = videos
    .filter((v) => v.position > 0 && !v.completed && !v.continueHidden)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  const recent = videos
    .filter((v) => v.lastPlayed)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  const playerEntry = player ? videos.find((v) => v.id === player.id) : null;
  const selectedShow = page.startsWith("show:")
    ? shows.find((s) => `show:${s.id}` === page)
    : undefined;
  useEffect(() => {
    const surfaces = document.querySelectorAll<HTMLElement>(
      ".workspace, .sidebar",
    );
    surfaces.forEach((el) => {
      el.inert = !!player;
    });
    return () =>
      surfaces.forEach((el) => {
        el.inert = false;
      });
  }, [player]);
  return (
    <div
      className="app-shell"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          dragCount.current++;
          setDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCount.current--;
        if (dragCount.current <= 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        dragCount.current = 0;
        void importEntries(
          Array.from(e.dataTransfer.files).map((file) => ({ file })),
        );
      }}
    >
      <AppSidebar
        page={page}
        setPage={setPage}
        playlists={playlists}
        count={videos.length}
        open={sidebar}
        close={() => setSidebar(false)}
        createPlaylist={createPlaylist}
        importFolder={chooseFolder}
      />
      <div className="workspace">
        <TopNavigation
          search={search}
          setSearch={(s) => {
            setSearch(s);
            if (
              page === "Settings" ||
              page === "Playlists" ||
              page === "TV Shows" ||
              page.startsWith("show:")
            )
              setPageState("All Videos");
          }}
          onImport={() => setImportDialog(true)}
          onMenu={() => setSidebar(true)}
        />
        <main>
          {loading ? (
            <div className="startup">
              <LoadingIndicator text="Opening your private cinema…" />
            </div>
          ) : page === "Settings" ? (
            <SettingsPage
              prefs={prefs}
              setPrefs={setPrefs}
              folders={folders}
              onFolder={chooseFolder}
              onClearLibrary={() =>
                setConfirm({
                  title: "Clear entire library and imports?",
                  message:
                    "Remove all imported entries, folder links, playlists, TV shows, thumbnails and playback history from this browser. Original files and appearance preferences are kept.",
                  action: async () => {
                    try {
                      await storage.clearLibrary();
                    } catch {
                      notify(
                        "Could not clear local storage. Your library is unchanged.",
                        true,
                      );
                      return;
                    }
                    files.current.clear();
                    entries.current = [];
                    setVideos([]);
                    setFolders([]);
                    setPlaylists([]);
                    setShows([]);
                    setFolderLocation(null);
                    notify(
                      "Library and imports cleared. Original files untouched.",
                    );
                  },
                })
              }
              onRescan={rescan}
              onRemoveFolder={(f) => {
                setFolders((prev) => prev.filter((x) => x.id !== f.id));
                storage
                  .removeFolder(f.id)
                  .catch(() => notify("Could not forget folder.", true));
                notify("Folder link removed. Library entries are kept.");
              }}
              onClearThumbnails={() =>
                setConfirm({
                  title: "Clear cached thumbnails?",
                  message:
                    "Your videos stay in the library. You can add a custom thumbnail or reimport to generate previews again.",
                  action: () => {
                    videos.forEach((v) =>
                      update(v.id, { thumbnail: undefined }),
                    );
                    notify("Thumbnail cache cleared.");
                  },
                })
              }
              onClearHistory={() =>
                setConfirm({
                  title: "Clear playback history?",
                  message:
                    "This resets watch positions, completion status, and recently played history for every video.",
                  action: () => {
                    videos.forEach((v) =>
                      update(v.id, {
                        position: 0,
                        lastPlayed: undefined,
                        completed: false,
                        speed: undefined,
                      }),
                    );
                    notify("Playback history cleared.");
                  },
                })
              }
              onReset={() => {
                setPrefs(defaults);
                notify("Preferences reset.");
              }}
              videoCount={videos.length}
            />
          ) : page === "TV Shows" || page.startsWith("show:") ? (
            <TVShows
              shows={shows}
              videos={videos}
              selected={selectedShow}
              actions={actions}
              onOpen={(s) => setPage(`show:${s.id}`)}
              onBack={() => setPage("TV Shows")}
              onEdit={(show) => setShowEditor({ show })}
              onDelete={(s) =>
                setConfirm({
                  title: "Delete TV show?",
                  message: `Remove “${s.name}” and its season mappings? Videos and their playback history stay in your library.`,
                  action: () => {
                    setShows((prev) => prev.filter((x) => x.id !== s.id));
                    storage
                      .removeShow(s.id)
                      .catch(() => notify("Could not delete TV show.", true));
                    videos
                      .filter((v) => v.showId === s.id)
                      .forEach((v) =>
                        update(v.id, {
                          showId: undefined,
                          season: undefined,
                          episode: undefined,
                        }),
                      );
                    setPage("TV Shows");
                  },
                })
              }
            />
          ) : page === "Playlists" ? (
            <>
              <div className="page-heading">
                <span className="eyebrow">GOOD STORIES, GREAT COMPANY</span>
                <h1>A collection for every mood.</h1>
                <p>Save a little inspiration for your next screening.</p>
              </div>
              <PlaylistManager
                playlists={playlists}
                onCreate={createPlaylist}
                onOpen={(p) => setPage(`playlist:${p.id}`)}
                onRename={(p) => {
                  setPlaylistName(p.name);
                  setPlaylistForm({ kind: "rename", playlist: p });
                }}
                onDelete={(p) =>
                  setConfirm({
                    title: "Delete playlist?",
                    message: `Delete “${p.name}”? Videos will stay in your library.`,
                    action: () => {
                      setPlaylists((prev) => prev.filter((x) => x.id !== p.id));
                      storage
                        .removePlaylist(p.id)
                        .catch(() =>
                          notify("Could not delete playlist.", true),
                        );
                    },
                  })
                }
              />
            </>
          ) : (
            <>
              {page === "Home" && !search && !folderLocation && (
                <>
                  <div className="welcome-row">
                    <div>
                      <span className="eyebrow">
                        LIGHTS DOWN. POSSIBILITY UP.
                      </span>
                      <h2>
                        Welcome to your happy place<span>.</span>
                      </h2>
                    </div>
                    <span className="private-badge">
                      <ShieldCheck size={14} />A space just for you
                    </span>
                  </div>
                  <Hero
                    onImport={() => setImportDialog(true)}
                    onFolder={chooseFolder}
                  />
                  <ContinueWatching
                    videos={continuing}
                    actions={actions}
                    onView={() => setPage("Continue Watching")}
                    onClear={clearContinue}
                  />
                </>
              )}
              {page !== "Home" && (
                <div className="page-heading">
                  <span className="eyebrow">YOUR PERSONAL BOX OFFICE</span>
                  <h1>{selectedPlaylist?.name || page}</h1>
                  <p>
                    {page === "Favorites"
                      ? "The stories you always come back to."
                      : page === "Recently Played"
                        ? "A look back at your recent screenings."
                        : page === "Continue Watching"
                          ? "Your next scene is waiting."
                          : selectedPlaylist
                            ? "A collection, curated by you."
                            : "Every story. One beautiful home."}
                  </p>
                </div>
              )}
              <div className="library-tabs">
                <div>
                  {[
                    {
                      label: "All videos",
                      p: "All Videos",
                      count: videos.length,
                    },
                    {
                      label: "Favorites",
                      p: "Favorites",
                      count: videos.filter((v) => v.favorite).length,
                    },
                    {
                      label: "Continue watching",
                      p: "Continue Watching",
                      count: continuing.length,
                    },
                  ].map((t) => (
                    <button
                      className={
                        page === t.p ||
                        (page === "Home" && t.p === "All Videos")
                          ? "active"
                          : ""
                      }
                      key={t.p}
                      onClick={() => setPage(t.p as Page)}
                    >
                      {t.label}
                      {t.count > 0 && <span>{t.count}</span>}
                    </button>
                  ))}
                </div>
                <span>
                  <HardDrive size={13} />
                  {size(videos.reduce((n, v) => n + v.size, 0))} in your
                  collection
                </span>
              </div>
              {(page === "Home" || page === "All Videos") && !search && (
                <FolderBrowser
                  folders={folders}
                  videos={videos}
                  location={folderLocation}
                  onNavigate={setFolderLocation}
                  onShow={(source) => setShowEditor({ source })}
                  onRescan={rescan}
                />
              )}
              {page === "Continue Watching" && continuing.length > 0 && (
                <div className="continue-toolbar">
                  <p>
                    Hide videos here without losing their saved resume
                    positions.
                  </p>
                  <button className="button subtle" onClick={clearContinue}>
                    <X size={15} />
                    Clear Continue Watching
                  </button>
                </div>
              )}
              <VideoLibrary
                videos={
                  (page === "Home" || page === "All Videos") && !folderLocation
                    ? collection.filter((v) => !episodeFor(v, shows))
                    : collection
                }
                showGroups={
                  (page === "Home" || page === "All Videos") &&
                  !folderLocation &&
                  shows.some((s) =>
                    collection.some(
                      (v) => episodeFor(v, shows)?.showId === s.id,
                    ),
                  ) ? (
                    <div className="show-grid" style={{ marginBottom: 24 }}>
                      {shows
                        .filter((s) =>
                          collection.some(
                            (v) => episodeFor(v, shows)?.showId === s.id,
                          ),
                        )
                        .map((s) => (
                          <article className="show-card" key={s.id}>
                            <button
                              className="show-cover"
                              onClick={() => setPage(`show:${s.id}`)}
                            >
                              <Clapperboard size={40} />
                              <span>
                                TV SHOW ·{" "}
                                {
                                  collection.filter(
                                    (v) =>
                                      episodeFor(v, shows)?.showId === s.id,
                                  ).length
                                }{" "}
                                episodes
                              </span>
                            </button>
                            <div>
                              <button
                                className="card-title"
                                onClick={() => setPage(`show:${s.id}`)}
                              >
                                {s.name}
                              </button>
                            </div>
                          </article>
                        ))}
                    </div>
                  ) : undefined
                }
                total={collectionCount}
                actions={actions}
                onImport={() => setImportDialog(true)}
                onFolder={chooseFolder}
                view={view}
                setView={setView}
                sort={sort}
                setSort={setSort}
                format={format}
                setFormat={setFormat}
                res={res}
                setRes={setRes}
                heading={
                  search
                    ? `Results for “${search}”`
                    : selectedPlaylist
                      ? selectedPlaylist.name
                      : "Your library"
                }
                filtered={
                  !!search ||
                  !!format ||
                  !!res ||
                  (page !== "Home" && page !== "All Videos")
                }
                compact={prefs.compact}
                folderBrowsing={
                  (page === "Home" || page === "All Videos") &&
                  !search &&
                  (folders.length > 0 || !!folderLocation)
                }
              />
              {page === "Home" && !search && !folderLocation && (
                <>
                  {recent.length > 0 && (
                    <RecentlyPlayed
                      videos={recent}
                      actions={actions}
                      onView={() => setPage("Recently Played")}
                    />
                  )}
                  <div className="benefit-strip">
                    <div>
                      <span>
                        <ShieldCheck size={20} />
                      </span>
                      <div>
                        <strong>Your files. Your rules.</strong>
                        <p>Always on your device. Always yours.</p>
                      </div>
                    </div>
                    <div>
                      <span>
                        <RefreshCw size={19} />
                      </span>
                      <div>
                        <strong>Never lose your place.</strong>
                        <p>Every story, right where you left it.</p>
                      </div>
                    </div>
                    <div>
                      <span>
                        <Clapperboard size={20} />
                      </span>
                      <div>
                        <strong>Made for movie nights.</strong>
                        <p>Less in the way. More on the screen.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <span className="status-dot" />
            All systems local <i>·</i> No uploads, ever.
          </span>
          <button className="text-button" onClick={() => setHelp(true)}>
            <CircleHelp size={13} />A little help <ArrowUpRight size={12} />
          </button>
          <span className="footer-brand">
            CINEVAULT <span>1.0</span>
          </span>
        </footer>
      </div>
      <input
        ref={individualInput}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          void importEntries(
            Array.from(e.target.files || []).map((file) => ({ file })),
          );
          e.target.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        hidden
        onChange={(e) => {
          void importFolderInput(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={reconnectInput}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && reconnect) {
            if (fileId(file) === reconnect.id) {
              files.current.set(reconnect.id, file);
              update(reconnect.id, { continueHidden: false });
              setPlayer({ id: reconnect.id, file });
              setReconnect(null);
            } else
              notify(
                "Please select the same file (matching name, size, and last modified date). Import changed files as new videos.",
                true,
              );
          }
          e.target.value = "";
        }}
      />
      {importDialog && (
        <ImportDialog
          onFiles={chooseFiles}
          onFolder={chooseFolder}
          onClose={() => setImportDialog(false)}
        />
      )}
      {importing && (
        <div className="import-progress" role="status">
          <LoadingIndicator text={importing} />
          <span>Generating previews locally</span>
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <div>
            <Upload size={45} />
            <h2>Drop a little cinema.</h2>
            <p>Add video files to your private collection.</p>
            <span>They’ll stay on your device.</span>
          </div>
        </div>
      )}
      {details && (
        <VideoDetails
          video={videos.find((v) => v.id === details.id) || details}
          onClose={() => setDetails(null)}
        />
      )}
      {error && <ErrorDialog message={error} onClose={() => setError("")} />}
      {reconnect && (
        <Modal title="Reconnect your video" onClose={() => setReconnect(null)}>
          <div className="dialog-body">
            <FolderOpen className="accent" size={32} />
            <h3>{reconnect.name}</h3>
            <p>
              Your library remembers this video, but browser permission or the
              file connection needs renewing. Select the original file to
              continue from your saved position.
            </p>
            <button
              className="button primary"
              onClick={() => reconnectInput.current?.click()}
            >
              <FolderOpen size={16} />
              Locate file
            </button>
            <p className="fine-print">
              For a folder library, reconnect and scan your folder from Settings
              to restore access to multiple videos at once.
            </p>
          </div>
        </Modal>
      )}
      {playlistForm && (
        <Modal
          title={
            playlistForm.kind === "add"
              ? "Add to a playlist"
              : playlistForm.kind === "rename"
                ? "Rename playlist"
                : "Make room for a new collection"
          }
          onClose={() => setPlaylistForm(null)}
        >
          <div className="dialog-body">
            {playlistForm.kind === "add" ? (
              <>
                <p>Choose a home for “{playlistForm.video?.name}”.</p>
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    className="menu-row playlist-choice"
                    onClick={() => {
                      if (!p.videoIds.includes(playlistForm.video!.id))
                        savePlaylist({
                          ...p,
                          videoIds: [...p.videoIds, playlistForm.video!.id],
                        });
                      setPlaylistForm(null);
                      notify(`Added to ${p.name}.`);
                    }}
                  >
                    <ListVideo size={18} />
                    {p.name}
                    <span>{p.videoIds.length} videos</span>
                  </button>
                ))}
                <button
                  className="button subtle"
                  onClick={() => {
                    setPlaylistName("");
                    setPlaylistForm({ ...playlistForm, kind: "create" });
                  }}
                >
                  <Plus size={16} />
                  Create a new playlist
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = playlistName.trim();
                  if (!name) return;
                  const p = playlistForm.playlist
                    ? { ...playlistForm.playlist, name }
                    : {
                        id: crypto.randomUUID(),
                        name,
                        videoIds: playlistForm.video
                          ? [playlistForm.video.id]
                          : [],
                      };
                  savePlaylist(p);
                  setPlaylistForm(null);
                  notify("Playlist saved.");
                }}
              >
                <label className="form-label">
                  Playlist name
                  <input
                    autoFocus
                    required
                    maxLength={70}
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="e.g. Sunday night cinema"
                  />
                </label>
                <p className="fine-print">
                  A home for the stories you want to keep together.
                </p>
                <button className="button primary" type="submit">
                  {playlistForm.kind === "rename"
                    ? "Save name"
                    : "Create playlist"}
                  <ArrowUpRight size={15} />
                </button>
              </form>
            )}
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <div className="dialog-body">
            <p>{confirm.message}</p>
            <div className="dialog-actions">
              <button
                className="button subtle"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Your cinema, without the complications."
          onClose={() => setHelp(false)}
        >
          <div className="dialog-body help-body">
            <h3>1. Bring your videos</h3>
            <p>
              Import files, connect a folder, or drag videos into the library.
              File permissions are read-only. Folder picking is available in
              compatible browsers on localhost or HTTPS.
            </p>
            <h3>2. Make yourself comfortable</h3>
            <p>
              Play a video, add subtitles, adjust speed, or save favorites and
              playlists. Progress is saved every few seconds and when you pause
              or leave the player.
            </p>
            <h3>3. Know your browser</h3>
            <p>
              MP4 with H.264/AAC and WebM work broadly. MKV support depends on
              the codecs and browser. If native playback fails, try MP4
              repackaging or full local conversion for files up to 256 MB. Large
              movies with unsupported video codecs, encrypted files, advanced
              ASS effects, and image-based subtitles may need a desktop player.
              Embedded text subtitles and alternate audio can be read locally
              even when your browser does not expose their tracks.
            </p>
            <p className="privacy-note">
              <ShieldCheck size={19} />
              No account, tracking, or media uploads. Site data belongs to this
              browser and this address; clearing it removes your metadata.
            </p>
          </div>
        </Modal>
      )}
      {showEditor && (
        <ShowEditor
          show={showEditor.show}
          source={showEditor.source}
          folders={folders}
          videos={videos}
          onClose={() => setShowEditor(null)}
          onSave={(s) => {
            if (!saveShow(s)) return;
            setShowEditor(null);
            setPage(`show:${s.id}`);
            notify("TV show saved. Original folders unchanged.");
          }}
        />
      )}
      {episodeEditor && (
        <EpisodeEditor
          video={episodeEditor}
          shows={shows}
          onClose={() => setEpisodeEditor(null)}
          onSave={(patch, newShow) => {
            if (newShow) saveShow(newShow);
            update(episodeEditor.id, patch);
            setEpisodeEditor(null);
            notify("Episode organization saved.");
          }}
        />
      )}
      {player && playerEntry && (
        <VideoPlayer
          key={player.id}
          entry={playerEntry}
          file={player.file}
          prefs={prefs}
          setPrefs={setPrefs}
          onSave={(patch) => update(player.id, patch)}
          onClose={() => setPlayer(null)}
          onFavorite={() =>
            update(player.id, { favorite: !playerEntry.favorite })
          }
          notify={notify}
        >
          <EpisodeBrowser
            entry={playerEntry}
            videos={videos}
            shows={shows}
            onPlay={(v) => {
              if (v.id !== player.id) void play(v);
            }}
          />
        </VideoPlayer>
      )}
      <ToastNotifications
        items={toasts}
        remove={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
    </div>
  );
}
