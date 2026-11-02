import { walkFolder, fileId } from "./media";
import type { Folder } from "../types";

export async function scanFolder(folder: Folder) {
  if (!folder.handle) return null;
  const permission = await (
    folder.handle as FileSystemDirectoryHandle & {
      queryPermission: (options: { mode: string }) => Promise<PermissionState>;
    }
  ).queryPermission({ mode: "read" });
  if (permission !== "granted") return null;
  const paths: string[] = [];
  const found = new Map<
    string,
    { file: File; handle: FileSystemFileHandle; relativePath: string }
  >();
  // Keep File references, not video bytes. Only reconcile after the full scan succeeds.
  for await (const entry of walkFolder(folder.handle, "", (path) =>
    paths.push(path),
  ))
    found.set(fileId(entry.file), entry);
  return { paths, found };
}
