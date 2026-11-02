import type { Folder, VideoEntry } from "../types";

type ReadableHandle = FileSystemHandle & {
  requestPermission: (options: { mode: "read" }) => Promise<PermissionState>;
};

// Call directly from a playback click: permission renewal needs user activation.
export async function resolveVideoFile(video: VideoEntry, folder?: Folder) {
  const root = folder?.handle;
  const authority = root || video.handle;
  if (!authority) return null;
  const permission = await (
    authority as unknown as ReadableHandle
  ).requestPermission({
    mode: "read",
  });
  if (permission !== "granted")
    throw new Error("Read permission was not granted.");
  let handle = video.handle;
  if (root && video.relativePath) {
    const parts = video.relativePath.split("/");
    if (parts.some((part) => !part || part === "." || part === ".."))
      throw new Error("Invalid saved file location.");
    let directory = root;
    for (const part of parts.slice(0, -1))
      directory = await directory.getDirectoryHandle(part);
    handle = await directory.getFileHandle(parts.at(-1)!);
  }
  if (!handle) return null;
  const file = await handle.getFile();
  if (
    file.name !== video.name ||
    file.size !== video.size ||
    file.lastModified !== video.modified
  )
    throw new Error(
      "This file has changed. Sync its folder or import the updated video.",
    );
  return { file, handle };
}
