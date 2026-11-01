import { ChevronRight, FolderOpen, Tv, RefreshCw } from "lucide-react";
import type { Folder, VideoEntry } from "../types";
import type { FolderLocation } from "../lib/organization";
import {
  directoryPaths,
  folderChildren,
  inside,
  parentPath,
} from "../lib/organization";
export function FolderBrowser({
  folders,
  videos,
  location,
  onNavigate,
  onShow,
  onRescan,
}: {
  folders: Folder[];
  videos: VideoEntry[];
  location: FolderLocation | null;
  onNavigate: (l: FolderLocation | null) => void;
  onShow: (l: FolderLocation) => void;
  onRescan: (f: Folder) => void;
}) {
  if (!folders.length) return null;
  const folder = folders.find((f) => f.id === location?.folderId);
  const cards = folder
    ? folderChildren(folder, videos, location!.path).map((path) => ({
        folder,
        path,
        name: path.split("/").at(-1)!,
      }))
    : folders.map((folder) => ({ folder, path: "", name: folder.name }));
  return (
    <section className="folder-browser" aria-label="Folder library">
      <div className="folder-toolbar">
        <nav aria-label="Folder breadcrumbs">
          <button
            onClick={() => onNavigate(null)}
            className={!folder ? "current" : ""}
          >
            Folders
          </button>
          {folder && (
            <>
              <ChevronRight size={13} />
              <button
                className={!location?.path ? "current" : ""}
                onClick={() => onNavigate({ folderId: folder.id, path: "" })}
              >
                {folder.name}
              </button>
              {location!.path
                .split("/")
                .filter(Boolean)
                .map((p, i, parts) => (
                  <span key={i}>
                    <ChevronRight size={13} />
                    <button
                      className={i === parts.length - 1 ? "current" : ""}
                      onClick={() =>
                        onNavigate({
                          folderId: folder.id,
                          path: parts.slice(0, i + 1).join("/"),
                        })
                      }
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </>
          )}
        </nav>
        {folder && (
          <div>
            <button className="text-button" onClick={() => onShow(location!)}>
              <Tv size={14} />
              Organize as TV show
            </button>
            <button
              className="icon-button"
              onClick={() => onRescan(folder)}
              aria-label="Reconnect and scan this folder"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      </div>
      {cards.length > 0 && (
        <div className="folder-grid">
          {cards.map(({ folder, path, name }) => {
            const members = videos.filter(
              (v) =>
                v.folderId === folder.id &&
                inside(parentPath(v.relativePath), path),
            );
            const subfolders = folderChildren(folder, videos, path).length;
            return (
              <article className="directory-card" key={folder.id + ":" + path}>
                <button
                  className="directory-open"
                  aria-label={`Open folder ${name}`}
                  onClick={() => onNavigate({ folderId: folder.id, path })}
                >
                  <span className="directory-icon">
                    <FolderOpen size={26} />
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>
                      {subfolders ? `${subfolders} folders · ` : ""}
                      {members.length} videos
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => onShow({ folderId: folder.id, path })}
                  title="Organize as TV show"
                  aria-label={`Organize ${name} as TV show`}
                >
                  <Tv size={16} />
                </button>
              </article>
            );
          })}
        </div>
      )}
      {folder && !folder.paths && (
        <p className="fine-print">
          This folder was imported before folder browsing was added. Reconnect
          and scan it once to restore its subfolder structure.
        </p>
      )}
    </section>
  );
}
