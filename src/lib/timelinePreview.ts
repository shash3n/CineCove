/** A separate decoder seeks without touching the playing video's currentTime. */
export class TimelinePreview {
  private video: HTMLVideoElement | null = null;
  private cache = new Map<number, string>();
  private queue: Promise<unknown> = Promise.resolve();
  private ticket = 0;
  private disposed = false;
  private cancel?: () => void;
  constructor(private source: string) {}
  frame(seconds: number): Promise<string | null> {
    const key = Math.floor(seconds / 2) * 2,
      ticket = ++this.ticket;
    if (this.cache.has(key)) return Promise.resolve(this.cache.get(key)!);
    const job = this.queue
      .catch(() => {})
      .then(() => {
        if (this.disposed || ticket !== this.ticket) return null;
        return new Promise<string | null>((resolve) => {
          const v = (this.video ??= document.createElement("video"));
          let settled = false;
          const finish = (result: string | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            v.onloadedmetadata = null;
            v.onseeked = null;
            v.onerror = null;
            this.cancel = undefined;
            if (result) {
              this.cache.set(key, result);
              while (this.cache.size > 120)
                this.cache.delete(this.cache.keys().next().value!);
            }
            resolve(result);
          };
          const timer = setTimeout(() => finish(null), 5000);
          this.cancel = () => finish(null);
          const capture = () => {
            try {
              if (v.readyState < 2 || !v.videoWidth) return finish(null);
              const canvas = document.createElement("canvas");
              canvas.width = 200;
              canvas.height = Math.max(
                1,
                Math.round((200 * v.videoHeight) / v.videoWidth),
              );
              canvas
                .getContext("2d")!
                .drawImage(v, 0, 0, canvas.width, canvas.height);
              finish(canvas.toDataURL("image/jpeg", 0.7));
            } catch {
              finish(null);
            }
          };
          const seek = () => {
            if (this.disposed || ticket !== this.ticket) return finish(null);
            const target = Math.max(
              0.001,
              Math.min(
                key,
                Number.isFinite(v.duration) ? v.duration - 0.01 : key,
              ),
            );
            v.onseeked = capture;
            if (Math.abs(v.currentTime - target) < 0.001 && v.readyState >= 2)
              capture();
            else v.currentTime = target;
          };
          v.onerror = () => finish(null);
          if (!v.src) {
            v.muted = true;
            v.preload = "metadata";
            v.onloadedmetadata = seek;
            v.src = this.source;
          } else seek();
        });
      });
    this.queue = job;
    return job;
  }
  dispose() {
    this.disposed = true;
    this.ticket++;
    this.cancel?.();
    this.video?.pause();
    this.video?.removeAttribute("src");
    this.video?.load();
    this.video = null;
    this.cache.clear();
  }
}
