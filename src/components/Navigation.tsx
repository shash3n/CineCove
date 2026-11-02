import {
  House,
  Clapperboard,
  History,
  Play,
  Heart,
  ListVideo,
  Settings,
  Plus,
  ShieldCheck,
  Folder,
  X,
  Search,
  Menu,
  ArrowUpRight,
  Tv,
} from "lucide-react";
import type { Page, Playlist } from "../types";
import { Logo } from "./UI";
const nav = [
  { name: "Home", icon: House },
  { name: "All Videos", icon: Clapperboard },
  { name: "TV Shows", icon: Tv },
  { name: "Recently Played", icon: History },
  { name: "Continue Watching", icon: Play },
  { name: "Favorites", icon: Heart },
  { name: "Playlists", icon: ListVideo },
] as const;
export function AppSidebar({
  page,
  setPage,
  playlists,
  count,
  open,
  close,
  createPlaylist,
  importFolder,
}: {
  page: Page;
  setPage: (p: Page) => void;
  playlists: Playlist[];
  count: number;
  open: boolean;
  close: () => void;
  createPlaylist: () => void;
  importFolder: () => void;
}) {
  const go = (p: Page) => {
    setPage(p);
    close();
  };
  return (
    <>
      <div
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        onClick={close}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-close"
            onClick={close}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.name}
              onClick={() => go(n.name)}
              className={`nav-item ${page === n.name ? "active" : ""}`}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.name === "All Videos" && (
                <span className="nav-count">{count}</span>
              )}
              {n.name === "Favorites" && <span className="tiny-dot" />}
            </button>
          ))}
        </nav>
        <div className="playlist-label">
          <span className="nav-label">YOUR PLAYLISTS</span>
          <button
            className="icon-button"
            title="Create playlist"
            aria-label="Create playlist"
            onClick={createPlaylist}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="sidebar-playlists">
          {playlists.length ? (
            playlists.map((p, i) => (
              <button
                className={`nav-item ${page === `playlist:${p.id}` ? "active" : ""}`}
                key={p.id}
                onClick={() => go(`playlist:${p.id}`)}
              >
                <span className={`playlist-square color-${i % 3}`}>
                  <ListVideo size={14} />
                </span>
                <span>{p.name}</span>
              </button>
            ))
          ) : (
            <p className="sidebar-hint">
              Great collections start
              <br />
              with a playlist.
            </p>
          )}
        </div>
        <button className="folder-card" onClick={importFolder}>
          <span className="folder-card-icon">
            <Folder size={20} />
            <Plus size={11} />
          </span>
          <strong>A home for your movies</strong>
          <span>Connect a folder. Settle in.</span>
          <span className="folder-card-link">
            Add a video folder <ArrowUpRight size={14} />
          </span>
        </button>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "Settings" ? "active" : ""}`}
            onClick={() => go("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
          <div className="local-status">
            <ShieldCheck size={14} />
            <span>100% local. Always private.</span>
            <i />
          </div>
        </div>
      </aside>
    </>
  );
}
export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="search-bar">
      <Search size={18} />
      <input
        aria-label="Search your library"
        placeholder="Search your library…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          className="icon-button"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : (
        <kbd>/</kbd>
      )}
    </label>
  );
}
export function TopNavigation({
  search,
  setSearch,
  onImport,
  onMenu,
}: {
  search: string;
  setSearch: (s: string) => void;
  onImport: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="top-navigation">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <Menu size={22} />
        </button>
        <span className="desktop-label">Your workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>Personal library</strong>
      </div>
      <div className="top-actions">
        <SearchBar value={search} onChange={setSearch} />
        <button className="button primary import-top" onClick={onImport}>
          <Plus size={17} />
          <span>Import videos</span>
        </button>
      </div>
    </header>
  );
}
