import { expect, test, vi } from 'vitest';
import { PublicationQueueLoader } from '../../src/domain/publication-queue-loader';

test('storage failure stops automatic loading until explicit reload; later success clears the failure', async () => {
  const read = vi.fn().mockRejectedValueOnce(Error('Secure storage unavailable')).mockResolvedValueOnce([]);
  const changed = vi.fn(); const loader = new PublicationQueueLoader(read, () => true, changed);
  await expect(loader.ensureLoaded()).rejects.toThrow(/storage/);
  expect(loader.phase).toBe('failed'); expect(changed.mock.calls.at(-1)![0].error.message).toMatch(/storage/);
  await expect(loader.ensureLoaded()).rejects.toThrow(/Reload/); expect(read).toHaveBeenCalledTimes(1);
  await loader.retry(); expect(loader.ready).toBe(true); expect(changed.mock.calls.at(-1)![0]).toEqual({ phase: 'ready' });
  await loader.ensureLoaded(); expect(read).toHaveBeenCalledTimes(2);
});

test('repeated reload taps share one load and do not overlap storage or receipt checks', async () => {
  let release!: () => void; const blocked = new Promise<void>(resolve => { release = resolve; });
  const read = vi.fn(async () => blocked); const changed = vi.fn();
  const loader = new PublicationQueueLoader(read, () => true, changed);
  const first = loader.retry(), second = loader.retry();
  expect(read).toHaveBeenCalledOnce(); expect(loader.phase).toBe('loading');
  release(); await Promise.all([first, second]);
  expect(changed.mock.calls.map(([state]) => state.phase)).toEqual(['loading', 'ready']);
});

test('authorization loss while loading cannot expose success; a foreground session may resume paused loading', async () => {
  let current = true; const changed = vi.fn();
  const read = vi.fn(async () => { current = false; return []; });
  const loader = new PublicationQueueLoader(read, () => current, changed);
  await expect(loader.ensureLoaded()).rejects.toThrow(/paused/);
  expect(loader.phase).toBe('paused'); expect(changed.mock.calls.map(([state]) => state.phase)).toEqual(['loading']);
  await expect(loader.retry()).rejects.toThrow(/paused/); expect(read).toHaveBeenCalledOnce();
  current = true; read.mockImplementationOnce(async () => []);
  await loader.ensureLoaded(); expect(loader.ready).toBe(true);
  current = false; await expect(loader.ensureLoaded()).rejects.toThrow(/paused/);
});

test('a transport error after backgrounding pauses rather than trapping the UI in hidden failed state', async () => {
  let current = true; const changed = vi.fn();
  const read = vi.fn(async (): Promise<unknown> => { current = false; throw Error('Network unavailable'); });
  const loader = new PublicationQueueLoader(read, () => current, changed);
  await expect(loader.ensureLoaded()).rejects.toThrow(/paused/); expect(loader.phase).toBe('paused');
  current = true; read.mockResolvedValueOnce([]);
  await loader.ensureLoaded(); expect(loader.ready).toBe(true);
});
