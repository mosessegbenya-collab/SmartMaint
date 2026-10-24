import { test, expect } from "vitest";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { AuthenticatedFileStore } from "../../src/domain/authenticated-file-store";
import { ReportRecoveryRepository, type RecoveryDraft } from "../../src/domain/report-recovery";
import type { PrivateStore } from "../../src/domain/report-queue";

function setup() {
  const metadata=new Map<string,string>(),files=new Map<string,Uint8Array>();
  const vault:PrivateStore={get:async k=>metadata.get(k)??null,set:async(k,v)=>{metadata.set(k,v);},remove:async k=>{metadata.delete(k);}};
  let generation=0;
  const fileAdapter={read:async(name:string)=>{const bytes=files.get(name);if(!bytes)throw Error('Missing ciphertext');return bytes;},write:async(name:string,bytes:Uint8Array)=>{files.set(name,bytes);},remove:async(name:string)=>{files.delete(name);}};
  const cipher={createKey:async()=>randomBytes(32).toString('hex'),encrypt:async(text:string,hex:string,context:string)=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(hex,'hex'),iv);c.setAAD(Buffer.from(context));return new Uint8Array(Buffer.concat([iv,c.update(text,'utf8'),c.final(),c.getAuthTag()]));},decrypt:async(bytes:Uint8Array,hex:string,context:string)=>{const b=Buffer.from(bytes),d=createDecipheriv('aes-256-gcm',Buffer.from(hex,'hex'),b.subarray(0,12));d.setAAD(Buffer.from(context));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString('utf8');}};
  const store=new AuthenticatedFileStore(vault,fileAdapter,cipher,()=>`generation-${++generation}`);
  return {metadata,files,vault,fileAdapter,cipher,store,repo:new ReportRecoveryRepository(store),next:()=>`generation-${++generation}`};
}
const draft:Omit<RecoveryDraft,'photos'>={owner:'OWNER',operationId:'OP',equipmentId:'DEVICE',departmentId:'DEPARTMENT',updatedAt:1,fields:{category:'',symptoms:'Private TEST draft',description:'',priority:'High',condition:'',inUse:'',noticedAt:'2026-10-24T10:00:00Z',emergency:false}};
const photo={operationId:'PHOTO',contentType:'image/png' as const,base64:Buffer.from('TEST PHOTOGRAPH').toString('base64')};
test('encrypted draft and photo survive adapter recreation, isolate accounts and never leave plaintext in ciphertext files',async()=>{
  const f=setup();await f.repo.saveDraft(draft);await f.repo.savePhoto('OWNER','OP',photo);
  const restarted=new ReportRecoveryRepository(new AuthenticatedFileStore(f.vault,f.fileAdapter,f.cipher,f.next));
  expect((await restarted.list('OWNER'))[0].fields.symptoms).toBe(draft.fields.symptoms);expect(await restarted.readPhoto('OWNER','OP','PHOTO')).toEqual(photo);expect(await restarted.list('OTHER')).toEqual([]);await expect(restarted.readPhoto('OTHER','OP','PHOTO')).rejects.toThrow(/unavailable/);
  for(const bytes of f.files.values()){expect(Buffer.from(bytes).includes(Buffer.from('Private TEST'))).toBe(false);expect(Buffer.from(bytes).includes(Buffer.from(photo.base64))).toBe(false);}
});
test('tampering, missing ciphertext and swapped owner context fail visibly instead of becoming an empty success',async()=>{
  const f=setup();await f.repo.saveDraft(draft);const pointer=JSON.parse(f.metadata.get('smartmaint.recovery.OWNER')!);const bytes=f.files.get(pointer.file)!;bytes[bytes.length-1]^=1;await expect(f.repo.list('OWNER')).rejects.toThrow();f.files.delete(pointer.file);await expect(f.repo.list('OWNER')).rejects.toThrow(/Missing/);
  const g=setup();await g.repo.saveDraft(draft);g.metadata.set('smartmaint.recovery.OTHER',g.metadata.get('smartmaint.recovery.OWNER')!);await expect(g.repo.list('OTHER')).rejects.toThrow();
});
test('failed and uncertain metadata writes preserve a complete decryptable generation',async()=>{
  const f=setup();await f.repo.saveDraft(draft);const original=f.vault.set;f.vault.set=async()=>{throw Error('Vault unavailable');};await expect(f.repo.saveDraft({...draft,fields:{...draft.fields,symptoms:'Replacement'}})).rejects.toThrow();f.vault.set=original;expect((await f.repo.list('OWNER'))[0].fields.symptoms).toBe('Private TEST draft');
  f.vault.set=async(k,v)=>{await original(k,v);throw Error('Lost completion');};await expect(f.repo.saveDraft({...draft,updatedAt:2})).rejects.toThrow(/Lost/);expect((await f.repo.list('OWNER'))[0].updatedAt).toBe(2);
});
test('draft/photo limits reject overflow without deleting existing work; removing one owner draft leaves other owners intact',async()=>{
  const f=setup();for(let i=0;i<5;i++)await f.repo.saveDraft({...draft,operationId:`OP${i}`});await expect(f.repo.saveDraft({...draft,operationId:'OVERFLOW'})).rejects.toThrow(/full/);expect(await f.repo.list('OWNER')).toHaveLength(5);
  for(let i=0;i<5;i++)await f.repo.savePhoto('OWNER','OP0',{...photo,operationId:`P${i}`});await expect(f.repo.savePhoto('OWNER','OP0',{...photo,operationId:'P6'})).rejects.toThrow(/invalid/);expect((await f.repo.list('OWNER'))[0].photos).toHaveLength(5);
  await f.repo.saveDraft({...draft,owner:'OTHER'});await f.repo.removeDraft('OWNER','OP0');expect(await f.repo.list('OWNER')).toHaveLength(4);expect(await f.repo.list('OTHER')).toHaveLength(1);
});
test('changing equipment identity, reusing a photo operation and invalid owners are rejected',async()=>{
  const f=setup();await f.repo.saveDraft(draft);await expect(f.repo.saveDraft({...draft,equipmentId:'OTHER_DEVICE'})).rejects.toThrow(/original equipment/);await f.repo.savePhoto('OWNER','OP',photo);await expect(f.repo.savePhoto('OWNER','OP',photo)).rejects.toThrow(/cannot be replaced/);await expect(f.repo.list('../OWNER')).rejects.toThrow(/owner/);
});

test('a photo remains readable when its index commits but the save result is lost', async () => {
  const f = setup();
  await f.repo.saveDraft(draft);
  const original = f.vault.set;
  f.vault.set = async (key, value) => {
    await original(key, value);
    if (key === 'smartmaint.recovery.OWNER') throw Error('Lost index completion');
  };
  await expect(f.repo.savePhoto('OWNER', 'OP', photo)).rejects.toThrow(/Lost index/);
  expect((await f.repo.list('OWNER'))[0].photos).toHaveLength(1);
  expect(await f.repo.readPhoto('OWNER', 'OP', 'PHOTO')).toEqual(photo);
});

test('a failed photo index write cleans up only the unreferenced photo', async () => {
  const f = setup();
  await f.repo.saveDraft(draft);
  const original = f.vault.set;
  f.vault.set = async (key, value) => {
    if (key === 'smartmaint.recovery.OWNER') throw Error('Index unavailable');
    await original(key, value);
  };
  await expect(f.repo.savePhoto('OWNER', 'OP', photo)).rejects.toThrow(/Index unavailable/);
  expect((await f.repo.list('OWNER'))[0].photos).toEqual([]);
  expect(f.metadata.has('smartmaint.recovery.OWNER.OP.PHOTO')).toBe(false);
  expect(f.files.size).toBe(1);
});

test('an unreadable index after a failed commit preserves uncertain photo evidence', async () => {
  const f = setup();
  await f.repo.saveDraft(draft);
  const originalSet = f.vault.set, originalGet = f.vault.get;
  let uncertain = false;
  f.vault.set = async (key, value) => {
    await originalSet(key, value);
    if (key === 'smartmaint.recovery.OWNER') { uncertain = true; throw Error('Lost completion'); }
  };
  f.vault.get = async (key) => {
    if (uncertain && key === 'smartmaint.recovery.OWNER') throw Error('Vault locked');
    return originalGet(key);
  };
  await expect(f.repo.savePhoto('OWNER', 'OP', photo)).rejects.toThrow(/Lost completion/);
  uncertain = false;
  expect(await f.repo.readPhoto('OWNER', 'OP', 'PHOTO')).toEqual(photo);
});

test('a recovered draft cannot move its photos into a different department', async () => {
  const f = setup();
  await f.repo.saveDraft(draft);
  await f.repo.savePhoto('OWNER', 'OP', photo);
  await expect(f.repo.saveDraft({ ...draft, departmentId: 'OTHER' })).rejects.toThrow(/original equipment and department/);
  expect((await f.repo.list('OWNER'))[0].departmentId).toBe('DEPARTMENT');
  expect(await f.repo.readPhoto('OWNER', 'OP', 'PHOTO')).toEqual(photo);
});

test('lost photo-pointer completion still indexes the verified complete photo', async () => {
  const f = setup(); await f.repo.saveDraft(draft);
  const original = f.vault.set;
  f.vault.set = async (key, value) => {
    await original(key, value);
    if (key === 'smartmaint.recovery.OWNER.OP.PHOTO') throw Error('Lost photo pointer completion');
  };
  await f.repo.savePhoto('OWNER', 'OP', photo);
  expect(await f.repo.readPhoto('OWNER', 'OP', 'PHOTO')).toEqual(photo);
  expect((await f.repo.list('OWNER'))[0].photos).toHaveLength(1);
});
