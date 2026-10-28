import { test, expect, vi } from "vitest";
import { EncryptedReportQueue, type PrivateStore, type PendingPublication } from "../../src/domain/report-queue";
import { PublicationCoordinator, MAX_PUBLICATION_ATTEMPTS, duePublication, retryDelay } from "../../src/domain/publication-coordinator";
import { PublicationQueueLoader } from "../../src/domain/publication-queue-loader";

test('a cached receipt acknowledges only its original reviewed report and photo revisions', async () => {
  const f = setup();
  expect(await f.worker.enqueue('REPORT', 1, 2, 'ORIGINAL')).toBe('REPORT');
  expect(await f.worker.enqueue('REPORT', 1, 2, 'RETRY')).toBe('REPORT');
  await expect(f.worker.enqueue('REPORT', 2, 2, 'DIFFERENT_FIELDS')).rejects.toThrow(/snapshot conflict/);
  await expect(f.worker.enqueue('REPORT', 1, 3, 'DIFFERENT_PHOTOS')).rejects.toThrow(/snapshot conflict/);
  expect(f.send).toHaveBeenCalledTimes(1);
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'SYNCED', expectedRevision: 1, expectedAttachmentRevision: 2 });
});

test('older stored receipts are verified once against the server before being shown as confirmed', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCED', serverId: 'REPORT' }]);
  const receipt = vi.fn(async () => 'REPORT');
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, () => {}, Date.now, undefined, receipt);
  expect((await worker.load())[0]).toMatchObject({ state: 'SYNCED', receiptBindingVersion: 1, expectedRevision: 1, expectedAttachmentRevision: 2 });
  await worker.load(); expect(receipt).toHaveBeenCalledTimes(1); expect(f.send).not.toHaveBeenCalled();
});

test('a mismatched legacy receipt becomes a review conflict without submitting or replacing its reviewed revisions', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCED', serverId: 'REPORT' }]);
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, () => {}, Date.now, undefined, async () => { throw Error('Publication revision conflict'); });
  expect((await worker.load())[0]).toMatchObject({ state: 'CONFLICT', expectedRevision: 1, expectedAttachmentRevision: 2, retryable: false });
  expect((await f.queue.load('OWNER'))[0].serverId).toBeUndefined(); expect(f.send).not.toHaveBeenCalled();
});

test('missing verification and authorization loss cannot display or upgrade an older stored receipt', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCED', serverId: 'REPORT' }]);
  const changed = vi.fn();
  const unavailable = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, changed);
  await expect(unavailable.load()).rejects.toThrow(/fresh server verification/);
  let current = true;
  const revoked = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => current, changed, Date.now, undefined, async () => { current = false; return 'REPORT'; });
  await expect(revoked.load()).rejects.toThrow(/paused/);
  expect(changed).not.toHaveBeenCalled(); expect((await f.queue.load('OWNER'))[0].receiptBindingVersion).toBeUndefined(); expect(f.send).not.toHaveBeenCalled();
});

test('loading multiple older receipts never exposes an unverified row when a later lookup fails', async () => {
  const f = setup();
  await f.queue.update('OWNER', () => [
    { ...row, state: 'SYNCED', serverId: 'REPORT' },
    { ...row, id: 'SECOND', reportId: 'REPORT_B', state: 'SYNCED', serverId: 'REPORT_B' },
  ]);
  const changed = vi.fn(); let fail = true;
  const receipt = vi.fn(async (entry: PendingPublication) => {
    if (entry.reportId === 'REPORT_B' && fail) throw Error('Network unavailable');
    return entry.reportId;
  });
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, changed, Date.now, undefined, receipt);
  await expect(worker.load()).rejects.toThrow(/Network/);
  expect(changed).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER')).map(row => row.receiptBindingVersion)).toEqual([1, undefined]);
  fail = false; await worker.load();
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed.mock.calls[0][0].every((row: PendingPublication) => row.receiptBindingVersion === 1)).toBe(true);
  expect(receipt).toHaveBeenCalledTimes(3); expect(f.send).not.toHaveBeenCalled();
});

test('concurrent queue loads share receipt verification and a failed load can be explicitly retried', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCED', serverId: 'REPORT' }]);
  let release!: () => void; const blocked = new Promise<void>(resolve => { release = resolve; });
  const receipt = vi.fn(async () => { await blocked; return 'REPORT'; }); const changed = vi.fn();
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, changed, Date.now, undefined, receipt);
  const first = worker.load(), second = worker.load();
  release(); await Promise.all([first, second]);
  expect(receipt).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenCalledTimes(1);
});

test('reloading after a storage failure preserves exhausted submission and reconciliation budgets', async () => {
  const f = setup();
  await f.queue.update('OWNER', () => [{ ...row, state: 'FAILED', retryCount: 5, reconciliationCount: 3, recoveryCount: 1, retryable: false }]);
  const get = f.store.get; let failed = true;
  f.store.get = async key => { if (failed) throw Error('Storage unavailable'); return get(key); };
  const loader = new PublicationQueueLoader(() => f.worker.load(), () => true, () => {});
  await expect(loader.ensureLoaded()).rejects.toThrow(/Storage/);
  failed = false; await loader.retry();
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'FAILED', retryCount: 5, reconciliationCount: 3, recoveryCount: 1 });
  await expect(f.worker.enqueue('REPORT', 1, 2, 'REPLACEMENT')).rejects.toThrow(/limit/);
  expect(f.send).not.toHaveBeenCalled();
});

test('authorization loss on a later receipt does not publish an earlier partial batch', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [
    { ...row, state: 'SYNCED', serverId: 'REPORT' },
    { ...row, id: 'SECOND', reportId: 'REPORT_B', state: 'SYNCED', serverId: 'REPORT_B' },
  ]);
  let current = true; const changed = vi.fn();
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => current, changed, Date.now, undefined, async entry => {
    if (entry.reportId === 'REPORT_B') current = false;
    return entry.reportId;
  });
  await expect(worker.load()).rejects.toThrow(/paused/);
  expect(changed).not.toHaveBeenCalled(); expect(f.send).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER')).map(row => row.receiptBindingVersion)).toEqual([1, undefined]);
});

function setup() {
  const values=new Map<string,string>();const store:PrivateStore={get:async k=>values.get(k)??null,set:async(k,v)=>{values.set(k,v);},remove:async k=>{values.delete(k);}};
  let generation=0,now=1000,active=true;const queue=new EncryptedReportQueue(store,()=>`g-${++generation}`);
  const send=vi.fn(async(row:PendingPublication)=>row.reportId);
  const worker=new PublicationCoordinator(queue,'OWNER',send,()=>active,()=>{},()=>now);
  return {values,store,queue,send,worker,time:(value:number)=>{now=value;},active:(value:boolean)=>{active=value;}};
}
const row:PendingPublication={id:'OP',owner:'OWNER',reportId:'REPORT',expectedRevision:1,expectedAttachmentRevision:2,createdAt:1,updatedAt:1,state:'PENDING',retryCount:0};

test('review 4: an exhausted uncertain attempt can reconcile a committed receipt without a sixth send', async () => {
  const f = setup();
  await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCING', retryCount: 5, lastAttempt: 1 }]);
  // The optional final constructor argument is a read-only receipt lookup.
  const args = [f.queue, 'OWNER', f.send, () => true, () => {}, () => 100000, undefined, async () => 'REPORT'] as const;
  const worker = new PublicationCoordinator(...args);
  expect(await worker.sendEntry('OP')).toBe('REPORT');
  expect(f.send).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ reportId: 'REPORT', state: 'SYNCED', retryCount: 5 });
});

test('review 4: reviewing an exhausted unchanged snapshot cannot silently reset its attempt budget', async () => {
  const f = setup();
  await f.queue.update('OWNER', () => [{ ...row, state: 'FAILED', retryCount: 5, retryable: false }]);
  await expect(f.worker.enqueue('REPORT', 1, 2, 'NEW_OPERATION')).rejects.toThrow(/limit|reconcil|recovery/i);
  expect(f.send).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER'))[0].retryCount).toBe(5);
});

test('review 4: interruption before sending attempt five requires reconciliation and one explicitly confirmed recovery', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, retryCount: 4 }]);
  const original = f.store.set;
  f.store.set = async (key, value) => { await original(key, value); if (key === 'smartmaint.queue.OWNER') f.active(false); };
  await expect(f.worker.sendEntry('OP')).rejects.toThrow(/paused/);
  expect(f.send).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'SYNCING', retryCount: 5 });
  f.store.set = original;
  const restarted = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, () => {}, () => 100000, undefined, async () => null);
  await expect(restarted.sendEntry('OP')).rejects.toThrow(/explicit bounded recovery/);
  expect(f.send).not.toHaveBeenCalled();
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ retryCount: 5, recoveryEligible: true, reconciliationCount: 1 });
  expect(await restarted.sendEntry('OP', true)).toBe('REPORT');
  expect(f.send).toHaveBeenCalledOnce();
  expect(f.send.mock.calls[0][0]).toMatchObject({ reportId: 'REPORT', retryCount: 5, recoveryCount: 1 });
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'SYNCED', retryCount: 5, recoveryCount: 1 });
});

test('review 4: receipt checks and explicit recovery remain bounded across restarts and uncertain failures', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCING', retryCount: 5 }]);
  const lookup = vi.fn(async () => null);
  const worker = () => new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, () => {}, () => 100000, undefined, lookup);
  await expect(worker().sendEntry('OP')).rejects.toThrow(/explicit bounded recovery/);
  f.send.mockRejectedValue(Error('Network timeout during recovery'));
  await expect(worker().sendEntry('OP', true)).rejects.toThrow(/Network timeout/);
  await expect(worker().sendEntry('OP', true)).rejects.toThrow(/unavailable/);
  for (let i = 0; i < 2; i++) await expect(worker().sendEntry('OP')).rejects.toThrow(/explicit bounded recovery/);
  await expect(worker().sendEntry('OP')).rejects.toThrow(/limit/);
  expect(lookup).toHaveBeenCalledTimes(3); expect(f.send).toHaveBeenCalledOnce();
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ retryCount: 5, recoveryCount: 1, reconciliationCount: 3, recoveryEligible: false });
});

test('review 4: receipt reconciliation reports a changed draft as a conflict and permits review of its new snapshot', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [{ ...row, state: 'SYNCING', retryCount: 5 }]);
  const worker = new PublicationCoordinator(f.queue, 'OWNER', f.send, () => true, () => {}, () => 100000, undefined, async () => { throw Error('Draft revision conflict: review the current report'); });
  await expect(worker.sendEntry('OP')).rejects.toThrow(/revision conflict/);
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'CONFLICT', retryCount: 5, reconciliationCount: 1, recoveryEligible: false });
  await expect(worker.enqueue('REPORT', 1, 2, 'UNCHANGED')).rejects.toThrow(/limit/);
  expect(await worker.enqueue('REPORT', 2, 3, 'REVIEWED')).toBe('REPORT');
  expect(f.send).toHaveBeenCalledOnce();
  expect(f.send.mock.calls[0][0]).toMatchObject({ reportId: 'REPORT', expectedRevision: 2, expectedAttachmentRevision: 3 });
});
test('parallel sends share one operation and preserve the reviewed revisions',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);
  const [a,b]=await Promise.all([f.worker.sendEntry('OP'),f.worker.sendEntry('OP')]);expect(a).toBe('REPORT');expect(b).toBe('REPORT');expect(f.send).toHaveBeenCalledOnce();expect(f.send.mock.calls[0][0]).toMatchObject({expectedRevision:1,expectedAttachmentRevision:2});expect((await f.queue.load('OWNER'))[0]).toMatchObject({state:'SYNCED',serverId:'REPORT'});
});
test('transport failures back off and stop at the persisted attempt limit',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);f.send.mockRejectedValue(Error('Network unavailable'));
  let now=1000;
  for(let attempt=1;attempt<=MAX_PUBLICATION_ATTEMPTS;attempt++){
    await expect(f.worker.sendEntry('OP')).rejects.toThrow(/Network/);
    const saved=(await f.queue.load('OWNER'))[0];expect(saved.retryCount).toBe(attempt);expect(saved.state).toBe('FAILED');
    if(attempt<MAX_PUBLICATION_ATTEMPTS){expect(saved.nextRetryAt).toBe(now+retryDelay(attempt));expect(duePublication(saved,now)).toBe(false);now=saved.nextRetryAt!;f.time(now);}
  }
  await expect(f.worker.sendEntry('OP')).rejects.toThrow(/attempt limit/);expect(f.send).toHaveBeenCalledTimes(MAX_PUBLICATION_ATTEMPTS);expect((await f.queue.load('OWNER'))[0].retryable).toBe(false);
});
test('conflicts and server permission rejections never auto retry',async()=>{
  for(const failure of [Error('Draft revision conflict'),Object.assign(Error('Access denied; network is irrelevant'),{data:'denied'})]){
    const f=setup();await f.queue.update('OWNER',()=>[row]);f.send.mockRejectedValue(failure);await expect(f.worker.sendEntry('OP')).rejects.toBe(failure);
    const saved=(await f.queue.load('OWNER'))[0];expect(duePublication(saved,Number.MAX_SAFE_INTEGER)).toBe(false);expect(saved.state).toBe(failure.message.includes('conflict')?'CONFLICT':'FAILED');
  }
});
test('loss of authorization before send preserves work and prevents the backend call',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);f.active(false);await expect(f.worker.sendEntry('OP')).rejects.toThrow(/paused/);expect(f.send).not.toHaveBeenCalled();expect((await f.queue.load('OWNER'))[0].state).toBe('PENDING');
});
test('authorization invalidated during storage preparation prevents sending',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);const original=f.store.set;f.store.set=async(k,v)=>{await original(k,v);f.active(false);};await expect(f.worker.sendEntry('OP')).rejects.toThrow(/paused/);expect(f.send).not.toHaveBeenCalled();expect((await f.queue.load('OWNER'))[0].state).not.toBe('SYNCED');
});
test('restart replays an uncertain attempt with the same report identity and accepts only a matching receipt',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[{...row,state:'SYNCING',retryCount:1,lastAttempt:1}]);f.time(5000);
  const restored=new PublicationCoordinator(f.queue,'OWNER',f.send,()=>true,()=>{},()=>5000);expect(await restored.sendEntry('OP')).toBe('REPORT');expect(f.send.mock.calls[0][0].reportId).toBe('REPORT');
  await f.queue.update('OWNER',()=>[row]);f.send.mockResolvedValue('WRONG_REPORT');await expect(f.worker.sendEntry('OP')).rejects.toThrow(/unexpected/);expect((await f.queue.load('OWNER'))[0].state).toBe('FAILED');
});
test('pending snapshots cannot be silently replaced and an explicit reviewed conflict may be resubmitted',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);await expect(f.worker.enqueue('REPORT',2,2,'NEW')).rejects.toThrow(/different snapshot/);expect((await f.queue.load('OWNER'))[0].expectedRevision).toBe(1);
  await f.queue.update('OWNER',()=>[{...row,state:'CONFLICT'}]);expect(await f.worker.enqueue('REPORT',2,3,'NEW')).toBe('REPORT');expect(f.send.mock.calls[0][0]).toMatchObject({id:'OP',expectedRevision:2,expectedAttachmentRevision:3});
});
test('invalid and duplicate writes are rejected before corrupting the last complete queue',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);for(const rows of [[row,{...row,id:'OTHER'}],[{...row,expectedRevision:0}],[{...row,owner:'OTHER'}]])await expect(f.queue.update('OWNER',()=>rows)).rejects.toThrow();expect(await f.queue.load('OWNER')).toEqual([row]);
});
test('a lost storage completion never deletes a newly committed queue generation',async()=>{
  const f=setup();await f.queue.update('OWNER',()=>[row]);const original=f.store.set;f.store.set=async(k,v)=>{await original(k,v);if(k==='smartmaint.queue.OWNER')throw Error('Lost storage completion');};await expect(f.queue.update('OWNER',items=>items.map(r=>({...r,retryCount:1})))).rejects.toThrow(/Lost/);expect((await f.queue.load('OWNER'))[0].retryCount).toBe(1);
});

test('a late failure from an old session cannot overwrite a newer matching server receipt', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [row]);
  let reject!: (reason: Error) => void, started!: () => void;
  const sending = new Promise<void>((resolve) => { started = resolve; });
  f.send.mockImplementation(() => { started(); return new Promise<string>((_, fail) => { reject = fail; }); });
  const oldAttempt = f.worker.sendEntry('OP');
  const failed = expect(oldAttempt).rejects.toThrow(/Old session transport/);
  await sending; f.active(false);
  const newSession = new PublicationCoordinator(f.queue, 'OWNER', async (pending) => pending.reportId, () => true, () => {}, () => 5000);
  expect(await newSession.sendEntry('OP')).toBe('REPORT');
  reject(Error('Old session transport failed')); await failed;
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'SYNCED', serverId: 'REPORT', retryCount: 2 });
});

test('switching accounts during an in-flight receipt persists it only for its original owner', async () => {
  const f = setup(); await f.queue.update('OWNER', () => [row]);
  let receipt!: (value: string) => void, started!: () => void;
  const sending = new Promise<void>((resolve) => { started = resolve; });
  f.send.mockImplementation(() => { started(); return new Promise<string>((resolve) => { receipt = resolve; }); });
  const pending = f.worker.sendEntry('OP'); await sending; f.active(false);
  const other = new PublicationCoordinator(f.queue, 'OTHER', async (item) => item.reportId, () => true, () => {});
  expect(await other.load()).toEqual([]);
  receipt('REPORT'); expect(await pending).toBe('REPORT');
  expect(await other.load()).toEqual([]);
  expect((await f.queue.load('OWNER'))[0]).toMatchObject({ state: 'SYNCED', serverId: 'REPORT' });
  await expect(f.worker.enqueue('ANOTHER', 1, 0, 'OTHER_OP')).rejects.toThrow(/paused/);
});
