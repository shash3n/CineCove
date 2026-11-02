import { useState } from "react";
import type { Playlist, VideoEntry } from "../types";
import { Modal } from "./UI";
import { title, time } from "../lib/media";

export function PlaylistVideoPicker({
  playlist,
  videos,
  onSave,
  onClose,
}: {
  playlist: Playlist;
  videos: VideoEntry[];
  onSave: (playlist: Playlist) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set(playlist.videoIds));
  const visible = videos.filter((v) =>
    `${v.name} ${v.relativePath || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <Modal title={`Select videos for ${playlist.name}`} onClose={onClose}>
      <div className="dialog-body playlist-picker">
        <label className="form-label">
          Search videos
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or folder…"
          />
        </label>
        <div className="playlist-picker-tools">
          <span role="status">{selected.size} selected</span>
          <button
            className="text-button"
            disabled={!visible.length}
            onClick={() =>
              setSelected(
                (previous) =>
                  new Set([...previous, ...visible.map((v) => v.id)]),
              )
            }
          >
            Select all shown
          </button>
          <button
            className="text-button"
            disabled={!visible.some((v) => selected.has(v.id))}
            onClick={() =>
              setSelected(
                (previous) =>
                  new Set(
                    [...previous].filter(
                      (id) => !visible.some((v) => v.id === id),
                    ),
                  ),
              )
            }
          >
            Clear shown
          </button>
        </div>
        <div className="playlist-picker-list">
          {visible.map((v) => (
            <label
              className={`playlist-picker-row ${selected.has(v.id) ? "selected" : ""}`}
              key={v.id}
            >
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggle(v.id)}
              />
              {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
              <span>
                <strong>{title(v.name)}</strong>
                <small>
                  {v.relativePath || v.name} ·{" "}
                  {v.duration ? time(v.duration) : v.format.toUpperCase()}
                </small>
              </span>
            </label>
          ))}
          {!visible.length && <p>No videos match your search.</p>}
        </div>
        <div className="playlist-picker-footer">
          <button className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={() => onSave({ ...playlist, videoIds: [...selected] })}
          >
            Save selection
          </button>
        </div>
      </div>
    </Modal>
  );
}
