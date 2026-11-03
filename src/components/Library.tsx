import { canContinue, isWatched } from "../lib/playback";
import {
  Play,
  Heart,
  MoreHorizontal,
  FolderOpen,
  Upload,
  Grid2X2,
  List,
  SlidersHorizontal,
  Film,
  Check,
  Info,
  ImagePlus,
  ListPlus,
  ListVideo,
  Trash2,
  X,
  Tv,
} from "lucide-react";
import { useState, useRef, memo } from "react";
import type { VideoEntry, Playlist } from "../types";
import { time, size, title, resolution } from "../lib/media";
import { EmptyState, Modal, SectionHeading } from "./UI";
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-art" aria-hidden="true">
        <div className="planet" />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="mountain mountain-back" />
        <div className="mountain mountain-mid" />
        <div className="mountain mountain-front" />
        <div className="hero-grain" />
      </div>
      <div className="hero-content">
        <div className="hero-tag">
          <span /> THE BEST SEAT IS YOURS
        </div>
        <h1>
          Your collection.
          <br />
          Your <em>cinema.</em>
        </h1>
        <p>
          All your stories, in one beautiful place.
          <br />A little more cinema. A lot more you.
        </p>
        <div className="hero-note">
          <span className="check-circle">
            <Check size={10} />
          </span>
          No uploads. No subscriptions. Just press play.
        </div>
      </div>
      <div className="hero-caption">
        <span className="caption-line" /> YOUR WORLD. ON THE BIG SCREEN.
      </div>
      <div className="hero-index">
        <span />
        01 <i>/</i> YOUR PRIVATE CINEMA
      </div>
    </section>
  );
}
export interface LibraryActions {
  play: (v: VideoEntry) => void;
  favorite: (v: VideoEntry) => void;
  remove: (v: VideoEntry) => void;
  details: (v: VideoEntry) => void;
  playlist: (v: VideoEntry) => void;
  queue?: (v: VideoEntry) => void;
  customThumbnail: (v: VideoEntry, file: File) => void;
  removeFromPlaylist?: (v: VideoEntry) => void;
  removeContinue?: (v: VideoEntry) => void;
  organizeEpisode?: (v: VideoEntry) => void;
}
export const VideoCard = memo(function VideoCard({
  video: v,
  actions,
}: {
  video: VideoEntry;
  actions: LibraryActions;
}) {
  const [menu, setMenu] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState({
    up: false,
    height: 420,
  });
  const thumb = useRef<HTMLInputElement>(null);
  const progress = v.duration
    ? Math.min(100, (v.position / v.duration) * 100)
    : 0;
  return (
    <article className="video-card">
      <div className={`video-poster poster-${v.name.length % 4}`}>
        <button
          className="poster-play"
          onClick={() => actions.play(v)}
          aria-label={`Play ${v.name}`}
        >
          {v.thumbnail ? (
            <img src={v.thumbnail} loading="lazy" alt="" />
          ) : (
            <div className="poster-fallback">
              <Film size={38} />
              <span>{v.format.toUpperCase()}</span>
            </div>
          )}
          <span className="play-bubble">
            <Play size={23} fill="currentColor" />
          </span>
        </button>
        <span className="format-badge">
          {v.sourceHeight || v.height ? resolution(v) : v.format.toUpperCase()}
        </span>
        <button
          className={`favorite-button ${v.favorite ? "is-favorite" : ""}`}
          onClick={() => actions.favorite(v)}
          aria-label={v.favorite ? "Remove favorite" : "Add favorite"}
        >
          <Heart size={16} fill={v.favorite ? "currentColor" : "none"} />
        </button>
        <span className="duration-badge">
          {v.duration ? time(v.duration) : v.format.toUpperCase()}
        </span>
        {isWatched(v) && (
          <span className="completed-badge">
            <Check size={12} />
            Watched
          </span>
        )}
        {progress > 0 && (
          <div className="card-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="card-info">
        <button
          className="card-title"
          onClick={() => actions.play(v)}
          title={v.name}
        >
          {title(v.name)}
        </button>
        <div className="card-meta">
          {v.missing && (
            <span className="danger-text">FILE UNAVAILABLE · </span>
          )}
          <span>{v.showId || v.season !== undefined ? "SHOW" : "MOVIE"}</span>
          <i />
          {v.season !== undefined && (
            <>
              <span>
                S{String(v.season).padStart(2, "0")}
                {v.episode !== undefined
                  ? ` · E${String(v.episode).padStart(2, "0")}`
                  : ""}
              </span>
              <i />
            </>
          )}
          <span>{v.format.toUpperCase()}</span>
          <i />
          <span>{size(v.size)}</span>
          {v.position > 0 && !isWatched(v) && (
            <>
              <i />
              <span>{time(Math.max(0, v.duration - v.position))} left</span>
            </>
          )}
        </div>
        <div className="card-menu">
          <button
            className="icon-button"
            aria-label={`Options for ${v.name}`}
            aria-expanded={menu}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const above = rect.top - 16,
                below = window.innerHeight - rect.bottom - 16;
              const up = below < 420 && above > below;
              setMenuPlacement({
                up,
                height: Math.max(120, up ? above : below),
              });
              setMenu(!menu);
            }}
          >
            <MoreHorizontal size={19} />
          </button>
          {menu && (
            <>
              <button
                className="menu-dismiss"
                aria-label="Close video options"
                onClick={() => setMenu(false)}
              />
              <div
                className={`dropdown ${menuPlacement.up ? "opens-up" : ""}`}
                style={{ maxHeight: menuPlacement.height }}
              >
                <span className="menu-group-label">VIDEO</span>
                <button
                  onClick={() => {
                    actions.details(v);
                    setMenu(false);
                  }}
                >
                  <Info size={16} />
                  Video details
                </button>
                <button
                  className="menu-primary"
                  onClick={() => {
                    actions.playlist(v);
                    setMenu(false);
                  }}
                >
                  <ListPlus size={16} />
                  Add to playlist
                </button>
                {actions.queue && (
                  <button
                    onClick={() => {
                      actions.queue?.(v);
                      setMenu(false);
                    }}
                  >
                    <ListVideo size={16} />
                    Add to queue
                  </button>
                )}
                <span className="menu-group-label">ORGANIZE</span>
                {actions.organizeEpisode && (
                  <button
                    onClick={() => {
                      actions.organizeEpisode?.(v);
                      setMenu(false);
                    }}
                  >
                    <Tv size={15} />
                    {v.showId ? "Edit TV episode" : "Organize as TV episode"}
                  </button>
                )}
                <button
                  onClick={() => {
                    thumb.current?.click();
                    setMenu(false);
                  }}
                >
                  <ImagePlus size={15} />
                  Custom thumbnail
                </button>
                <span className="menu-group-label">REMOVE</span>
                {actions.removeContinue && canContinue(v) && (
                  <button
                    onClick={() => {
                      actions.removeContinue?.(v);
                      setMenu(false);
                    }}
                  >
                    <X size={15} />
                    Remove from Continue Watching
                  </button>
                )}
                {actions.removeFromPlaylist && (
                  <button
                    onClick={() => {
                      actions.removeFromPlaylist?.(v);
                      setMenu(false);
                    }}
                  >
                    <X size={15} />
                    Remove from playlist
                  </button>
                )}
                <button
                  className="danger-text"
                  onClick={() => {
                    actions.remove(v);
                    setMenu(false);
                  }}
                >
                  <Trash2 size={15} />
                  Remove from library
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <input
        hidden
        type="file"
        ref={thumb}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0])
            actions.customThumbnail(v, e.target.files[0]);
          e.target.value = "";
        }}
      />
    </article>
  );
});
export function VideoGrid({
  videos,
  actions,
}: {
  videos: VideoEntry[];
  actions: LibraryActions;
}) {
  return (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} actions={actions} />
      ))}
    </div>
  );
}
export function VideoList({
  videos,
  actions,
}: {
  videos: VideoEntry[];
  actions: LibraryActions;
}) {
  return (
    <div className="video-list">
      <div className="list-heading">
        <span>VIDEO</span>
        <span>FORMAT</span>
        <span>DURATION</span>
        <span>SIZE</span>
        <span />
      </div>
      {videos.map((v) => (
        <div className="video-row" key={v.id}>
          <button className="row-video" onClick={() => actions.play(v)}>
            <span className="row-thumb">
              {v.thumbnail ? (
                <img src={v.thumbnail} alt="" />
              ) : (
                <Film size={22} />
              )}
              <Play size={16} className="row-play" />
            </span>
            <span>
              <strong>{title(v.name)}</strong>
              <small>
                {v.sourceHeight || v.height
                  ? resolution(v)
                  : "Ready to inspect"}
                {isWatched(v)
                  ? " · Watched"
                  : v.position > 0
                    ? ` · ${time(v.position)} watched`
                    : ""}
              </small>
            </span>
          </button>
          <span className="muted">{v.format.toUpperCase()}</span>
          <span className="muted">{v.duration ? time(v.duration) : "—"}</span>
          <span className="muted">{size(v.size)}</span>
          <div className="row-actions">
            {actions.organizeEpisode && (
              <button
                className="icon-button"
                aria-label="Organize as TV episode"
                onClick={() => actions.organizeEpisode?.(v)}
              >
                <Tv size={16} />
              </button>
            )}
            {actions.removeContinue &&
              v.position > 0 &&
              !isWatched(v) &&
              !v.continueHidden && (
                <button
                  className="icon-button"
                  aria-label="Remove from Continue Watching"
                  onClick={() => actions.removeContinue?.(v)}
                >
                  <X size={16} />
                </button>
              )}
            <button
              className={`icon-button ${v.favorite ? "accent" : ""}`}
              aria-label="Toggle favorite"
              onClick={() => actions.favorite(v)}
            >
              <Heart size={16} fill={v.favorite ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-button"
              aria-label="Video details"
              onClick={() => actions.details(v)}
            >
              <Info size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Add to playlist"
              onClick={() => actions.playlist(v)}
            >
              <ListPlus size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={
                actions.removeFromPlaylist
                  ? "Remove from playlist"
                  : "Remove from library"
              }
              onClick={() =>
                actions.removeFromPlaylist
                  ? actions.removeFromPlaylist(v)
                  : actions.remove(v)
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function VideoLibrary({
  videos,
  total,
  actions,
  onImport,
  onFolder,
  view,
  setView,
  sort,
  setSort,
  format,
  setFormat,
  res,
  setRes,
  watchStatus,
  setWatchStatus,
  mediaType,
  setMediaType,
  heading = "Your library",
  filtered = false,
  compact = false,
  folderBrowsing = false,
  showGroups,
}: {
  videos: VideoEntry[];
  total: number;
  actions: LibraryActions;
  onImport: () => void;
  onFolder: () => void;
  view: "grid" | "list";
  setView: (v: "grid" | "list") => void;
  sort: string;
  setSort: (s: string) => void;
  format: string;
  setFormat: (s: string) => void;
  res: string;
  setRes: (s: string) => void;
  watchStatus: string;
  setWatchStatus: (s: string) => void;
  mediaType: string;
  setMediaType: (s: string) => void;
  heading?: string;
  filtered?: boolean;
  compact?: boolean;
  folderBrowsing?: boolean;
  showGroups?: React.ReactNode;
}) {
  const [filters, setFilters] = useState(false);
  return (
    <section className={`library-section ${compact ? "compact" : ""}`}>
      <div className="section-heading">
        <div className="inline-heading">
          <h2>{heading}</h2>
          <span className="count-badge">
            {total} {total === 1 ? "video" : "videos"}
          </span>
        </div>
        <div className="library-tools">
          <label className="sort-label">
            <span>Sort by:</span>
            <select
              aria-label="Sort videos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="added">Date added</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
              <option value="size">File size</option>
            </select>
          </label>
          <button
            className={`button subtle filter-button ${filters ? "selected" : ""}`}
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <SlidersHorizontal size={15} />
            Filters
            {(format || res || watchStatus || mediaType) && (
              <span className="tiny-dot" />
            )}
          </button>
          <div className="view-switch">
            <button
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={view === "grid" ? "selected" : ""}
              onClick={() => setView("grid")}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              aria-label="List view"
              aria-pressed={view === "list"}
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      {filters && (
        <div className="filter-panel">
          <label>
            Watch status
            <select
              aria-label="Filter watch status"
              value={watchStatus}
              onChange={(e) => setWatchStatus(e.target.value)}
            >
              <option value="">All videos</option>
              <option value="watched">Watched</option>
              <option value="unwatched">Unwatched</option>
            </select>
          </label>
          <label>
            Media type
            <select
              aria-label="Filter media type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="tv">TV shows</option>
              <option value="movies">Movies</option>
            </select>
          </label>
          <label>
            Format
            <select
              aria-label="Filter format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="">All formats</option>
              {[
                "mp4",
                "mkv",
                "webm",
                "mov",
                "avi",
                "m4v",
                "mpeg",
                "mpg",
                "wmv",
                "flv",
                "3gp",
                "ts",
                "mts",
                "m2ts",
                "ogv",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            Resolution
            <select
              aria-label="Filter resolution"
              value={res}
              onChange={(e) => setRes(e.target.value)}
            >
              <option value="">All resolutions</option>
              <option value="4K">4K</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="SD">Below 720p</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setFormat("");
              setRes("");
              setWatchStatus("");
              setMediaType("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {showGroups}
      {videos.length ? (
        view === "grid" ? (
          <VideoGrid videos={videos} actions={actions} />
        ) : (
          <VideoList videos={videos} actions={actions} />
        )
      ) : showGroups ? null : folderBrowsing ? (
        <div className="folder-empty">
          No videos directly in this location. Choose a folder above to browse
          its videos.
        </div>
      ) : filtered ? (
        <EmptyState
          title="No videos here yet"
          description="Try another search or filter, or add videos to this collection."
        />
      ) : (
        <div className="library-empty">
          <div className="empty-film-stack">
            <span />
            <span />
            <div>
              <Film size={31} />
              <span className="mini-plus">+</span>
            </div>
          </div>
          <h3>A great library starts with your first video.</h3>
          <p>
            Drop your videos here, or connect a folder to bring your collection
            together.
          </p>
          <p className="fine-print">
            Use Import videos above to choose files or connect a folder.
          </p>
          <span className="format-hint">
            MP4 <i /> MKV <i /> MOV <i /> WEBM <span>and more</span>
          </span>
        </div>
      )}
    </section>
  );
}
function PlusIcon() {
  return <Upload size={16} />;
}
export function ContinueWatching({
  videos,
  actions,
  onView,
  onClear,
}: {
  videos: VideoEntry[];
  actions: LibraryActions;
  onView: () => void;
  onClear?: () => void;
}) {
  if (!videos.length) return null;
  return (
    <section className="continue-section">
      <div className="section-heading">
        <h2>Pick up where you left off</h2>
        <div className="continue-actions">
          {onClear && (
            <button className="text-button" onClick={onClear}>
              <X size={13} />
              Clear all
            </button>
          )}
          <button className="text-button" onClick={onView}>
            View all
          </button>
        </div>
      </div>
      <VideoGrid videos={videos.slice(0, 3)} actions={actions} />
    </section>
  );
}
export function RecentlyPlayed({
  videos,
  actions,
  onView,
}: {
  videos: VideoEntry[];
  actions: LibraryActions;
  onView: () => void;
}) {
  if (!videos.length) return null;
  return (
    <section className="recent-section">
      <SectionHeading
        title="Recently played"
        action="View history"
        onClick={onView}
      />
      <VideoGrid videos={videos.slice(0, 3)} actions={actions} />
    </section>
  );
}
export function VideoDetails({
  video: v,
  onClose,
}: {
  video: VideoEntry;
  onClose: () => void;
}) {
  return (
    <Modal title="Video details" onClose={onClose}>
      <div className="dialog-body details-body">
        {v.thumbnail && (
          <img
            className="details-image"
            src={v.thumbnail}
            alt="Video preview"
          />
        )}
        <h3>{v.name}</h3>
        <dl>
          {[
            ["Format", v.format.toUpperCase()],
            ["Size", size(v.size)],
            [
              "Duration",
              v.duration ? time(v.duration) : "Unavailable until decoded",
            ],
            [
              "Resolution",
              v.sourceWidth || v.width
                ? `${v.sourceWidth || v.width} × ${v.sourceHeight || v.height} · ${resolution(v)}`
                : "Unavailable until decoded",
            ],
            ["Added", new Date(v.added).toLocaleDateString()],
            [
              "Last played",
              v.lastPlayed
                ? new Date(v.lastPlayed).toLocaleString()
                : "Not played yet",
            ],
            ["Playback", isWatched(v) ? "Watched" : time(v.position)],
            [
              "Access",
              v.handle ? "Linked file handle" : "Reconnect file after reload",
            ],
          ].map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
        <p className="fine-print">
          Quality labels use source dimensions, including the width of cropped
          widescreen videos. Filename quality tags never override measured media
          dimensions. Native playback still depends on codec support.
        </p>
      </div>
    </Modal>
  );
}
export function PlaylistManager({
  playlists,
  onCreate,
  onOpen,
  onRename,
  onDelete,
}: {
  playlists: Playlist[];
  onCreate: () => void;
  onOpen: (p: Playlist) => void;
  onRename: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
}) {
  return (
    <section>
      <SectionHeading
        title="Your playlists"
        action="Create playlist"
        onClick={onCreate}
      />
      {playlists.length ? (
        <div className="playlist-grid">
          {playlists.map((p, i) => (
            <article className="playlist-collection" key={p.id}>
              <button
                className={`playlist-cover color-${i % 3}`}
                onClick={() => onOpen(p)}
              >
                <List size={40} />
                <span>{p.videoIds.length} VIDEOS</span>
              </button>
              <div>
                <button className="card-title" onClick={() => onOpen(p)}>
                  {p.name}
                </button>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onRename(p)}>
                    Rename
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onDelete(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Curate your next movie night"
          description="Keep your comfort movies, weekend watches, and hidden gems together."
          action={
            <button className="button primary" onClick={onCreate}>
              <ListPlus size={17} />
              Create a playlist
            </button>
          }
        />
      )}
    </section>
  );
}
