import { PublicationPaused } from './publication-coordinator';

export type QueueLoadState = { phase: 'loading' | 'ready' | 'failed' | 'paused'; error?: unknown };

/** Loading never sends, clears queue data, or resets publication budgets. */
export class PublicationQueueLoader {
  private pending: Promise<void> | null = null;
  private state: QueueLoadState = { phase: 'paused' };
  constructor(private load: () => Promise<unknown>, private current: () => boolean, private changed: (state: QueueLoadState) => void) {}
  get phase() { return this.state.phase; }
  get ready() { return this.phase === 'ready'; }
  ensureLoaded(): Promise<void> {
    if (!this.current()) return Promise.reject(new PublicationPaused());
    if (this.ready) return Promise.resolve();
    if (this.phase === 'failed') return Promise.reject(Error('Reload the private queue to retry loading it.'));
    return this.run();
  }
  retry(): Promise<void> {
    if (!this.current()) return Promise.reject(new PublicationPaused());
    return this.ready ? Promise.resolve() : this.run();
  }
  private notify(state: QueueLoadState) {
    this.state = state;
    if (this.current()) this.changed(state);
  }
  private run(): Promise<void> {
    if (this.pending) return this.pending;
    const work = (async () => {
      if (!this.current()) throw new PublicationPaused();
      this.notify({ phase: 'loading' });
      try {
        await this.load();
        if (!this.current()) throw new PublicationPaused();
        this.notify({ phase: 'ready' });
      } catch (error) {
        const failure = this.current() ? error : new PublicationPaused();
        this.notify({ phase: failure instanceof PublicationPaused ? 'paused' : 'failed', error: failure });
        throw failure;
      }
    })();
    this.pending = work;
    void work.finally(() => { if (this.pending === work) this.pending = null; }).catch(() => {});
    return work;
  }
}
