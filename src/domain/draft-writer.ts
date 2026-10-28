/** Coalesce typing; flush the latest selected snapshot before navigation/backgrounding. */
export class DraftWriter<T> {
  private pending: T | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private serial: Promise<void> = Promise.resolve();
  private closed = false;
  constructor(private write: (snapshot: T) => Promise<void>, private failed: (error: unknown) => void, private delay = 750) {}
  schedule(snapshot: T) {
    if (this.closed) return;
    this.pending = snapshot; clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(this.failed); }, this.delay);
  }
  flush(): Promise<void> {
    clearTimeout(this.timer);
    const snapshot = this.pending; this.pending = null;
    if (snapshot === null) return this.serial;
    return this.enqueue(snapshot);
  }
  private enqueue(snapshot: T) {
    const work = this.serial.catch(() => {}).then(() => this.write(snapshot));
    this.serial = work; return work;
  }
  /** Replace pending typing and save after any write already in flight. */
  writeNow(snapshot: T): Promise<void> {
    if (this.closed) return Promise.reject(Error("This device draft writer is closed."));
    this.cancel();
    return this.enqueue(snapshot);
  }
  /** Stop future writes and drain accepted work before deleting a receipt's draft. */
  close(): Promise<void> {
    this.closed = true;
    this.cancel();
    this.serial = this.serial.catch(() => {});
    return this.serial;
  }
  cancel() { clearTimeout(this.timer); this.pending = null; }
}
