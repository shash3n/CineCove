import {
  FolderOpen,
  Files,
  ShieldCheck,
  ArrowRight,
  MonitorPlay,
} from "lucide-react";
import { Modal } from "./UI";
export function ImportDialog({
  onFiles,
  onFolder,
  onClose,
}: {
  onFiles: () => void;
  onFolder: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Bring your collection home" onClose={onClose}>
      <div className="dialog-body">
        <p className="dialog-intro">
          Your files stay right where they belong. On your device.
        </p>
        <button className="import-option" onClick={onFolder}>
          <span>
            <FolderOpen size={25} />
          </span>
          <div>
            <strong>Connect a video folder</strong>
            <p>Import a collection, including subfolders.</p>
            <small>Reconnect saved folders in supported browsers</small>
          </div>
          <ArrowRight size={19} />
        </button>
        <button className="import-option" onClick={onFiles}>
          <span>
            <Files size={25} />
          </span>
          <div>
            <strong>Choose video files</strong>
            <p>Add one video or a whole movie marathon.</p>
            <small>You can also drag files into the library</small>
          </div>
          <ArrowRight size={19} />
        </button>
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <p>
            No uploads, ever. CineVault reads only the files you select.
            Removing a video from your library never deletes the original.
          </p>
        </div>
        <div className="compat-note">
          <MonitorPlay size={16} />
          <p>
            MP4, MKV, WebM, MOV, and more. Playback depends on your browser’s
            codec support. Optional local conversion is available for files up
            to 256 MB.
          </p>
        </div>
      </div>
    </Modal>
  );
}
