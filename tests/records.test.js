import test from 'node:test';
import assert from 'node:assert/strict';
import {RecordStore,newPatient,newVisit} from '../src/records.js';
class MemoryStorage{constructor(){this.data=new Map();}get length(){return this.data.size;}key(i){return [...this.data.keys()][i];}getItem(k){return this.data.get(k)||null;}setItem(k,v){this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
const clone=v=>JSON.parse(JSON.stringify(v));
function backend(){const rows=new Map();let offline=false;return {rows,setOffline:v=>offline=v,list:async()=>{if(offline)throw Error('offline');return clone([...rows.values()]);},save:async r=>{if(offline)throw Error('offline');const old=rows.get(r.document.id);if(old?.last_change_id===r.changeId)return clone(old);if((old?.revision||0)!==r.revision)throw {code:'40001'};const row={id:r.document.id,document:clone(r.document),revision:(old?.revision||0)+1,last_change_id:r.changeId};rows.set(row.id,row);return clone(row);}};}
async function setup(owner='owner-a',storage=new MemoryStorage(),b=backend()){const store=new RecordStore(owner,b,storage);await store.refresh();return {store,storage,b};}
test('last keystroke survives immediate navigation/reload before network sync',async()=>{
 const {store,storage,b}=await setup();b.setOffline(true);const p=newPatient({name:'홍길동',birth:'1950-01-01'},'2026-10-22');store.create(p);
 store.update(p.id,doc=>{doc.visits[0].note='마지막 글자까지';});store.stop();
 const next=new RecordStore('owner-a',b,storage);await next.refresh();assert.equal(next.read(p.id).document.visits[0].note,'마지막 글자까지');assert.equal(next.dirty().length,1);
 b.setOffline(false);await next.sync();assert.equal(b.rows.get(p.id).document.visits[0].note,'마지막 글자까지');assert.equal(next.dirty().length,0);next.stop();
});
test('new visit and same-name patients keep separate responses',async()=>{
 const {store}=await setup();const first=newPatient({name:'홍길동'},'2026-10-22'),second=newPatient({name:'홍길동'},'2026-10-22');store.create(first);store.create(second);store.update(first.id,d=>{d.visits[0].note='첫 회차';d.visits.push(newVisit('2026-10-29',2));});assert.notEqual(first.id,second.id);assert.equal(store.read(first.id).document.visits[1].note,'');assert.equal(store.read(first.id).document.visits[0].note,'첫 회차');assert.equal(store.read(second.id).document.visits.length,1);store.stop();
});
test('user cache is isolated and clean logout clears only the signed-in user',async()=>{
 const storage=new MemoryStorage(),a=await setup('a',storage),b=await setup('b',storage);a.store.create(newPatient({name:'A'},'2026-10-22'));b.store.create(newPatient({name:'B'},'2026-10-22'));a.store.clearCache();assert.equal(new RecordStore('a',a.b,storage).documents().length,0);assert.equal(new RecordStore('b',b.b,storage).documents()[0].identity.name,'B');a.store.stop();b.store.stop();
});
test('edits arriving while a save is in flight remain dirty and are sent afterwards',async()=>{
 const {store,b}=await setup();const p=newPatient({name:'A'},'2026-10-22');store.create(p);const original=b.save;let release;b.save=async r=>{await new Promise(resolve=>release=resolve);return original(r);};const pending=store.sync();await new Promise(resolve=>setImmediate(resolve));store.update(p.id,d=>d.identity.name='최신');release();await pending;assert.equal(store.read(p.id).document.identity.name,'최신');assert.equal(store.read(p.id).dirty,true);assert.equal(store.read(p.id).revision,1);b.save=original;await store.sync();assert.equal(b.rows.get(p.id).document.identity.name,'최신');assert.equal(store.dirty().length,0);store.stop();
});
test('conflicting devices preserve local edits and create a separate recoverable copy',async()=>{
 const b=backend(),a=await setup('a',new MemoryStorage(),b);const p=newPatient({name:'홍길동'},'2026-10-22');a.store.create(p);await a.store.sync();const device2=await setup('a',new MemoryStorage(),b);
 a.store.update(p.id,d=>d.visits[0].note='기기1');await a.store.sync();device2.store.update(p.id,d=>d.visits[0].note='기기2');await device2.store.sync();assert.equal(device2.store.read(p.id).conflict,true);assert.equal(device2.store.read(p.id).document.visits[0].note,'기기2');assert.equal(b.rows.get(p.id).document.visits[0].note,'기기1');const copied=await device2.store.conflictCopy(p.id);assert.notEqual(copied,p.id);assert.equal(b.rows.get(copied).document.visits[0].note,'기기2');assert.equal(device2.store.read(p.id).document.visits[0].note,'기기1');a.store.stop();device2.store.stop();
});
test('quota failure reports risk rather than claiming the edit was saved to device',async()=>{
 const {store,b}=await setup();store.storage.setItem=()=>{throw Error('quota');};b.setOffline(true);const p=newPatient({name:'A'},'2026-10-22');store.create(p);assert.equal(store.cacheError,true);assert.equal(store.read(p.id).document.identity.name,'A');await store.sync();assert.equal(store.cacheError,true);store.stop();
});
