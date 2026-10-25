/** Coalesce typing; flush the latest selected snapshot before navigation/backgrounding. */
export class DraftWriter<T> {
  private pending: T | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private serial: Promise<void> = Promise.resolve();
  constructor(private write: (snapshot: T) => Promise<void>, private failed: (error: unknown) => void, private delay = 750) {}
  schedule(snapshot: T) {
    this.pending = snapshot; clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(this.failed); }, this.delay);
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    const snapshot = this.pending; this.pending = null;
    if (snapshot === null) return this.serial;
    const work = this.serial.catch(() => {}).then(() => this.write(snapshot));
    this.serial = work; return work;
  }
  cancel() { clearTimeout(this.timer); this.pending = null; }
}
