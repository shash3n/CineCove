import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
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
  const [dragged, setDragged] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  return (
    <div className="playback-queue">
      <header className="queue-heading">
        <div>
          <h3>Queue</h3>
          <span>
            {Math.max(
              0,
              videos.findIndex((v) => v.id === currentId),
            ) + 1}{" "}
            / {videos.length}
          </span>
        </div>
        <button className="text-button" onClick={onClear}>
          Clear
        </button>
      </header>
      <ol className="queue-list" aria-label="Playback queue">
        {videos.map((v, index) => (
          <li
            key={v.id}
            aria-current={v.id === currentId ? "true" : undefined}
            className={`queue-item ${v.id === currentId ? "current" : ""} ${target === v.id ? "drop-target" : ""}`}
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
                "text/x-cinecove-queue",
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
                event.dataTransfer.setData("text/x-cinecove-queue", v.id);
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
              <span className="queue-thumb">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" loading="lazy" />
                ) : (
                  <span className="queue-thumb-fallback">
                    {v.format.toUpperCase()}
                  </span>
                )}
                <span className="queue-duration">{time(v.duration)}</span>
              </span>
              <span className="queue-copy">
                <strong>{title(v.name)}</strong>
                <small>
                  {v.duration ? time(v.duration) : v.format.toUpperCase()}
                  {index === 0 ? " · Next up" : ""}
                </small>
              </span>
            </button>
            <div className="queue-row-actions">
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
    </div>
  );
}
