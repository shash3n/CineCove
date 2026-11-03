export function loadQueue(): string[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("cinecove.queue") ||
        localStorage.getItem("cinevault.queue") ||
        "[]",
    );
    return Array.isArray(saved)
      ? [...new Set(saved.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}
export function moveQueue(ids: string[], source: string, target: string) {
  const from = ids.indexOf(source),
    to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, source);
  return next;
}
