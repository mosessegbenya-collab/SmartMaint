import { test, expect, vi } from "vitest";
import { EncryptedReportQueue, type PrivateStore, type PendingPublication } from "../../src/domain/report-queue";
import { PublicationCoordinator, MAX_PUBLICATION_ATTEMPTS, duePublication, retryDelay } from "../../src/domain/publication-coordinator";

function setup() {
  const values=new Map<string,string>();const store:PrivateStore={get:async k=>values.get(k)??null,set:async(k,v)=>{values.set(k,v);},remove:async k=>{values.delete(k);}};
  let generation=0,now=1000,active=true;const queue=new EncryptedReportQueue(store,()=>`g-${++generation}`);
  const send=vi.fn(async(row:PendingPublication)=>row.reportId);
  const worker=new PublicationCoordinator(queue,'OWNER',send,()=>active,()=>{},()=>now);
  return {values,store,queue,send,worker,time:(value:number)=>{now=value;},active:(value:boolean)=>{active=value;}};
}
const row:PendingPublication={id:'OP',owner:'OWNER',reportId:'REPORT',expectedRevision:1,expectedAttachmentRevision:2,createdAt:1,updatedAt:1,state:'PENDING',retryCount:0};
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
