export interface VideoEntry {
  id: string;
  name: string;
  size: number;
  modified: number;
  format: string;
  added: number;
  duration: number;
  width: number;
  height: number;
  thumbnail?: string;
  position: number;
  lastPlayed?: number;
  completed?: boolean;
  favorite: boolean;
  speed?: number;
  handle?: FileSystemFileHandle;
  folderId?: string;
  relativePath?: string;
  continueHidden?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
  showId?: string;
  season?: number;
  episode?: number;
  missing?: boolean;
}
export interface Playlist {
  id: string;
  name: string;
  videoIds: string[];
}
export interface Folder {
  id: string;
  name: string;
  handle?: FileSystemDirectoryHandle;
  paths?: string[];
  ignoredIds?: string[];
  added: number;
}
export interface Preferences {
  theme: "dark" | "light";
  accent: "violet" | "blue" | "mint";
  compact: boolean;
  speed: number;
  volume: number;
  autoResume: boolean;
  thumbnails: boolean;
  sort: string;
  subtitleSize: number;
  subtitleColor: string;
  subtitleBackground: boolean;
  subtitleOpacity: number;
  subtitleFont: string;
  subtitleEdge: "none" | "shadow" | "outline" | "raised";
  subtitleBackgroundColor: string;
  subtitleBackgroundOpacity: number;
  subtitlePosition: "bottom" | "top";
  subtitleOffset: number;
  subtitleLanguage: string;
}
export const defaults: Preferences = {
  theme: "dark",
  accent: "violet",
  compact: false,
  speed: 1,
  volume: 0.8,
  autoResume: true,
  thumbnails: true,
  sort: "added",
  subtitleSize: 24,
  subtitleColor: "#ffffff",
  subtitleBackground: true,
  subtitleOpacity: 1,
  subtitleFont: "sans-serif",
  subtitleEdge: "shadow",
  subtitleBackgroundColor: "#000000",
  subtitleBackgroundOpacity: 0.7,
  subtitlePosition: "bottom",
  subtitleOffset: 4,
  subtitleLanguage: "en",
};
export interface Cue {
  start: number;
  end: number;
  text: string;
}
export type Page =
  | "Home"
  | "All Videos"
  | "Recently Played"
  | "Continue Watching"
  | "Favorites"
  | "Playlists"
  | "Settings"
  | "TV Shows"
  | `show:${string}`
  | `playlist:${string}`;
export interface SeasonFolder {
  folderId: string;
  path: string;
  season: number;
}
export interface TVShow {
  id: string;
  name: string;
  folders: SeasonFolder[];
}
export interface AudioTrack {
  id: string;
  label: string;
  language: string;
  enabled: boolean;
}
