import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { VideoEntry } from "../types";
import { title, time } from "../lib/media";

export interface PlaybackQueueProps {
  videos: VideoEntry[];
  library: VideoEntry[];
  currentId: string;
  onAdd: (video: VideoEntry) => void;
  onPlay: (video: VideoEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onMove: (source: string, target: string) => void;
}
export function PlaybackQueue({
  videos,
  library,
  currentId,
  onAdd,
  onPlay,
  onRemove,
  onClear,
  onMove,
}: PlaybackQueueProps) {
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const queued = new Set(videos.map((v) => v.id));
  const available = library.filter(
    (v) =>
      v.id !== currentId &&
      !queued.has(v.id) &&
      v.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="playback-queue">
      <h3>
        Up next <span className="count-badge">{videos.length}</span>
      </h3>
      <p className="fine-print">
        Auto-next plays this order before continuing TV episodes. Drag the
        handles to reorder.
      </p>
      {videos.length > 0 && (
        <button className="queue-clear text-button" onClick={onClear}>
          <Trash2 size={14} />
          Clear queue
        </button>
      )}
      <ol className="queue-list" aria-label="Playback queue">
        {videos.map((v, index) => (
          <li
            key={v.id}
            className={`queue-item ${target === v.id ? "drop-target" : ""}`}
            data-video-id={v.id}
            onDragOver={(event) => {
              if (dragged) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setTarget(v.id);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const source = event.dataTransfer.getData(
                "text/x-cinevault-queue",
              );
              if (source) onMove(source, v.id);
              setDragged(null);
              setTarget(null);
            }}
          >
            <button
              className="queue-grip icon-button"
              draggable
              aria-label={`Drag ${title(v.name)} to reorder`}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/x-cinevault-queue", v.id);
                event.dataTransfer.effectAllowed = "move";
                setDragged(v.id);
              }}
              onDragEnd={() => {
                setDragged(null);
                setTarget(null);
              }}
            >
              <GripVertical size={17} />
            </button>
            <span className="queue-number">{index + 1}</span>
            <button
              className="queue-video"
              onClick={() => onPlay(v)}
              title={`Play ${title(v.name)} now`}
            >
              <strong>{title(v.name)}</strong>
              <small>
                {v.duration ? time(v.duration) : v.format.toUpperCase()}
                {index === 0 ? " · Next up" : ""}
              </small>
            </button>
            <div className="queue-row-actions">
              <button
                className="icon-button"
                aria-label={`Move ${title(v.name)} up`}
                disabled={index === 0}
                onClick={() => onMove(v.id, videos[index - 1].id)}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={`Move ${title(v.name)} down`}
                disabled={index === videos.length - 1}
                onClick={() => onMove(v.id, videos[index + 1].id)}
              >
                <ArrowDown size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={`Remove ${title(v.name)} from queue`}
                onClick={() => onRemove(v.id)}
              >
                <X size={15} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!videos.length && (
        <p className="queue-empty">
          Your queue is empty. Add a video below or from its library menu.
        </p>
      )}
      <label className="form-label queue-search">
        Add videos
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search your library…"
        />
      </label>
      <div className="queue-candidates">
        {available.slice(0, 30).map((v) => (
          <button
            className="menu-row"
            key={v.id}
            onClick={() => onAdd(v)}
            aria-label={`Queue ${title(v.name)}`}
          >
            <Plus size={15} />
            <span>{title(v.name)}</span>
          </button>
        ))}
        {!available.length && (
          <p className="fine-print">
            {search
              ? "No matching videos available."
              : "All available videos are queued."}
          </p>
        )}
        {available.length > 30 && (
          <p className="fine-print">Search to find more videos.</p>
        )}
      </div>
    </div>
  );
}
