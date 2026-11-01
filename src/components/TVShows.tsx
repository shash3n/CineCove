import { useState } from "react";
import {
  Tv,
  Plus,
  Settings2,
  Trash2,
  FolderOpen,
  X,
  Play,
  ChevronLeft,
} from "lucide-react";
import type { TVShow, VideoEntry, Folder, SeasonFolder } from "../types";
import type { LibraryActions } from "./Library";
import type { FolderLocation } from "../lib/organization";
import {
  directoryPaths,
  episodeFor,
  suggestedSeasons,
  episodeNumber,
} from "../lib/organization";
import { VideoGrid } from "./Library";
import { Modal, EmptyState } from "./UI";
export function TVShows({
  shows,
  videos,
  selected,
  actions,
  onOpen,
  onEdit,
  onDelete,
  onBack,
}: {
  shows: TVShow[];
  videos: VideoEntry[];
  selected?: TVShow;
  actions: LibraryActions;
  onOpen: (s: TVShow) => void;
  onEdit: (s?: TVShow) => void;
  onDelete: (s: TVShow) => void;
  onBack: () => void;
}) {
  const [season, setSeason] = useState<number | null>(null);
  const episodes = selected
    ? videos
        .map((v) => ({ v, e: episodeFor(v, shows) }))
        .filter(({ e }) => e?.showId === selected.id)
        .sort(
          (a, b) =>
            a.e!.season - b.e!.season ||
            (a.e!.episode ?? 9999) - (b.e!.episode ?? 9999) ||
            a.v.name.localeCompare(b.v.name, undefined, { numeric: true }),
        )
    : [];
  const seasons = [
    ...new Set([
      ...episodes.map(({ e }) => e!.season),
      ...(selected?.folders.map((f) => f.season) || []),
    ]),
  ].sort((a, b) => a - b);
  const active =
    season !== null && seasons.includes(season) ? season : seasons[0];
  return (
    <section className="tv-shows">
      <div className="page-heading">
        <span className="eyebrow">ONE MORE EPISODE</span>
        <h1>{selected?.name || "Your TV shows"}</h1>
        <p>
          {selected
            ? "Seasons and episodes, organized your way."
            : "Turn folders and videos into a collection you can settle into."}
        </p>
      </div>
      {selected ? (
        <>
          <div className="show-toolbar">
            <button className="text-button" onClick={onBack}>
              <ChevronLeft size={15} />
              All TV shows
            </button>
            <button className="button subtle" onClick={() => onEdit(selected)}>
              <Settings2 size={15} />
              Edit show & season folders
            </button>
          </div>
          <div className="show-banner">
            <Tv size={45} />
            <div>
              <span className="eyebrow">YOUR PRIVATE BOX SET</span>
              <h2>{selected.name}</h2>
              <p>
                {seasons.length} seasons · {episodes.length} episodes
              </p>
            </div>
          </div>
          <div className="season-tabs" role="tablist" aria-label="Seasons">
            {seasons.map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={active === s}
                className={active === s ? "selected" : ""}
                onClick={() => setSeason(s)}
              >
                {s === 0 ? "Specials" : `Season ${s}`}
                <span>
                  {episodes.filter(({ e }) => e!.season === s).length}
                </span>
              </button>
            ))}
          </div>
          {episodes.filter(({ e }) => e!.season === active).length ? (
            <VideoGrid
              videos={episodes
                .filter(({ e }) => e!.season === active)
                .map(({ v, e }) => ({
                  ...v,
                  season: e!.season,
                  episode: e!.episode,
                }))}
              actions={actions}
            />
          ) : (
            <EmptyState
              title="Your next season starts here"
              description="Map an imported season folder, or use a video's menu to assign it to this show."
              action={
                <button
                  className="button primary"
                  onClick={() => onEdit(selected)}
                >
                  <FolderOpen size={16} />
                  Map season folders
                </button>
              }
            />
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <h2>Your collections</h2>
            <button className="button primary" onClick={() => onEdit()}>
              <Plus size={16} />
              Create TV show
            </button>
          </div>
          {shows.length ? (
            <div className="show-grid">
              {shows.map((s) => {
                const members = videos.filter(
                  (v) => episodeFor(v, shows)?.showId === s.id,
                );
                const poster = members.find((v) => v.thumbnail)?.thumbnail;
                return (
                  <article className="show-card" key={s.id}>
                    <button
                      className="show-cover"
                      onClick={() => onOpen(s)}
                      aria-label={`Open show ${s.name}`}
                    >
                      {poster ? (
                        <img src={poster} loading="lazy" alt="" />
                      ) : (
                        <Tv size={48} />
                      )}
                      <span>
                        <Play size={18} fill="currentColor" />
                        Explore show
                      </span>
                    </button>
                    <div>
                      <button className="card-title" onClick={() => onOpen(s)}>
                        {s.name}
                      </button>
                      <small>{members.length} episodes</small>
                      <div>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${s.name}`}
                          onClick={() => onEdit(s)}
                        >
                          <Settings2 size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete show ${s.name}`}
                          onClick={() => onDelete(s)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Give your shows their own home"
              description="Organize videos into shows and seasons, or turn an imported folder into a TV show."
              action={
                <button className="button primary" onClick={() => onEdit()}>
                  <Tv size={16} />
                  Create your first show
                </button>
              }
            />
          )}
        </>
      )}
    </section>
  );
}
export function ShowEditor({
  show,
  source,
  folders,
  videos,
  onSave,
  onClose,
}: {
  show?: TVShow;
  source?: FolderLocation;
  folders: Folder[];
  videos: VideoEntry[];
  onSave: (s: TVShow) => void;
  onClose: () => void;
}) {
  const folder = folders.find((f) => f.id === source?.folderId);
  const [name, setName] = useState(
      show?.name || source?.path.split("/").at(-1) || folder?.name || "",
    ),
    [links, setLinks] = useState<SeasonFolder[]>(
      show?.folders ||
        (source && folder ? suggestedSeasons(folder, videos, source.path) : []),
    );
  const choices = folders.flatMap((f) =>
    directoryPaths(f, videos).map((path) => ({
      folderId: f.id,
      path,
      label: f.name + (path ? "/" + path : ""),
    })),
  );
  const [choice, setChoice] = useState("0"),
    [season, setSeason] = useState(1),
    [error, setError] = useState("");
  return (
    <Modal
      title={show ? "Edit TV show" : "Organize a TV show"}
      onClose={onClose}
      wide
    >
      <form
        className="dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            id: show?.id || crypto.randomUUID(),
            name: name.trim(),
            folders: links,
          });
        }}
      >
        <label className="form-label">
          Show name
          <input
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Planet Earth"
          />
        </label>
        <h3>Season folders</h3>
        <p className="fine-print">
          Assign an imported folder to a season. Files and nested subfolders
          become episodes. These are library labels; your disk folders stay
          untouched. More specific mappings take priority.
        </p>
        <div className="season-mappings">
          {links.map((l, i) => (
            <div key={i}>
              <FolderOpen size={16} />
              <span>
                {folders.find((f) => f.id === l.folderId)?.name ||
                  "Disconnected folder"}
                {l.path ? "/" + l.path : ""}
              </span>
              <label>
                Season
                <input
                  aria-label={`Season for ${l.path || "root folder"}`}
                  type="number"
                  min="0"
                  max="999"
                  value={l.season}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              season: Math.max(
                                0,
                                Math.min(999, +e.target.value),
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  setLinks((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Remove season folder mapping"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        {choices.length > 0 && (
          <div className="season-add">
            <label className="form-label">
              Folder
              <select
                aria-label="Season folder"
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
              >
                {choices.map((c, i) => (
                  <option key={i} value={i}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Season
              <input
                aria-label="New season number"
                type="number"
                min="0"
                max="999"
                value={season}
                onChange={(e) =>
                  setSeason(Math.max(0, Math.min(999, +e.target.value)))
                }
              />
            </label>
            <button
              type="button"
              className="button subtle"
              onClick={() => {
                const c = choices[+choice];
                if (
                  links.some(
                    (l) => l.folderId === c.folderId && l.path === c.path,
                  )
                ) {
                  setError(
                    "This folder already has a mapping. Edit its season number above.",
                  );
                  return;
                }
                setLinks([
                  ...links,
                  { folderId: c.folderId, path: c.path, season },
                ]);
                setError("");
              }}
            >
              <Plus size={15} />
              Add mapping
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="danger-text fine-print">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Save show
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function EpisodeEditor({
  video,
  shows,
  onSave,
  onClose,
}: {
  video: VideoEntry;
  shows: TVShow[];
  onSave: (patch: Partial<VideoEntry>, newShow?: TVShow) => void;
  onClose: () => void;
}) {
  const current = episodeFor(video, shows);
  const [showId, setShowId] = useState(current?.showId || "new"),
    [name, setName] = useState(""),
    [season, setSeason] = useState(current?.season ?? 1),
    [episode, setEpisode] = useState(current?.episode ?? 1);
  return (
    <Modal title="Organize as a TV episode" onClose={onClose}>
      <form
        className="dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          const newShow =
            showId === "new"
              ? { id: crypto.randomUUID(), name: name.trim(), folders: [] }
              : undefined;
          if (newShow && !newShow.name) return;
          onSave({ showId: newShow?.id || showId, season, episode }, newShow);
        }}
      >
        <p>{video.name}</p>
        <label className="form-label">
          TV show
          <select
            aria-label="TV show"
            value={showId}
            onChange={(e) => setShowId(e.target.value)}
          >
            <option value="new">Create a new show</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {showId === "new" && (
          <label className="form-label">
            New show name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Show title"
            />
          </label>
        )}
        <div className="season-add">
          <label className="form-label">
            Season
            <input
              aria-label="Episode season"
              type="number"
              min="0"
              max="999"
              value={season}
              onChange={(e) => setSeason(+e.target.value)}
            />
          </label>
          <label className="form-label">
            Episode
            <input
              aria-label="Episode number"
              type="number"
              min="1"
              max="9999"
              value={episode}
              onChange={(e) => setEpisode(+e.target.value)}
            />
          </label>
        </div>
        <p className="fine-print">
          Season 0 is for specials. Folder-based episodes follow their folder
          mapping unless you assign them here.
        </p>
        <div className="dialog-actions">
          {video.showId && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                onSave({
                  showId: undefined,
                  season: undefined,
                  episode: undefined,
                })
              }
            >
              Use folder assignment
            </button>
          )}
          <button className="button primary" type="submit">
            Save episode
          </button>
        </div>
      </form>
    </Modal>
  );
}
