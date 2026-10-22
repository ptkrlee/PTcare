export const STORAGE_PREFIX='ptcare-records-v1:';
const copy=value=>JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
export function newVisit(date,sequence=1){return {id:crypto.randomUUID(),sequence,date,createdAt:now(),updatedAt:now(),forms:{},note:''};}
export function newPatient(identity,date){const id=crypto.randomUUID();return {schemaVersion:1,id,identity:{name:'',birth:'',sex:'',...identity},createdAt:now(),updatedAt:now(),archived:false,visits:[newVisit(date)]};}
export function newForm(){return {answers:{},fields:{},drawings:{},answeredAt:{},mobility:'walking',comment:'',note:'',updatedAt:now()};}
export function formFor(visit,key){
 const form=visit.forms[key]||newForm();
 if(key==='tug'){const fields={'tug-distance':'3',...form.fields};if(fields['tug-manual-protocol']==='기타 수동 과제')fields['tug-manual-protocol']='기타 신체 과제';return {...form,fields};}
 if(key==='sts'&&form.fields?.['sts-five-time']===undefined){const legacy=visit.forms.sarcopenia?.fields?.['asm-chair-5'];if(legacy!==undefined)return {...form,fields:{...form.fields,'sts-five-time':legacy}};}
 return form;
}
export class RecordStore{
 constructor(owner,backend,storage=globalThis.localStorage){
  this.owner=owner;this.backend=backend;this.storage=storage;this.prefix=STORAGE_PREFIX+owner+':';this.memory=new Map();this.listeners=new Set();this.running=null;this.timer=null;this.active=true;this.error='';this.cacheError=false;this.cacheFailures=new Set();this.loading=true;
  try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(this.prefix)){const value=JSON.parse(storage.getItem(key));this.memory.set(value.document.id,value);}}}catch{this.cacheError=true;this.error='기기 임시 저장소를 읽을 수 없습니다. 창을 닫지 말고 서버 저장을 확인해 주세요.';}
 }
 onChange(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 emit(){if(this.active)for(const fn of this.listeners)fn();}
 key(id){return this.prefix+id;}
 read(id){return this.memory.get(id);}
 documents(){return [...this.memory.values()].map(r=>r.document).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
 dirty(){return [...this.memory.values()].filter(r=>r.dirty);}
 write(record){
  this.memory.set(record.document.id,record);
  try{this.storage.setItem(this.key(record.document.id),JSON.stringify(record));this.cacheFailures.delete(record.document.id);this.cacheError=this.cacheFailures.size>0;}
  catch{this.cacheFailures.add(record.document.id);this.cacheError=true;this.error='기기 임시 저장 실패. 서버 저장 완료 전에는 페이지를 닫지 마세요.';}
 }
 update(id,mutator){
  let base=this.read(id);
  // Re-read the newest durable local state before every mutation, preserving edits from another tab.
  try{const local=JSON.parse(this.storage.getItem(this.key(id)));if(local&&!this.cacheFailures.has(id)&&(!base||local.document.updatedAt>=base.document.updatedAt))base=local;}catch{}
  if(!base)throw new Error('대상자 기록을 찾을 수 없습니다.');
  const record=copy(base);mutator(record.document);record.document.updatedAt=now();record.dirty=true;
  record.changeId=crypto.randomUUID();record.error='';this.write(record);this.emit();this.schedule();return record.document;
 }
 create(document){if(this.loading)throw new Error('대상자 목록을 불러온 후 다시 시도해 주세요.');this.write({document,revision:0,changeId:crypto.randomUUID(),dirty:true,conflict:false});this.emit();this.schedule();return document;}
 schedule(){clearTimeout(this.timer);if(this.active)this.timer=setTimeout(()=>this.sync(),500);}
 async refresh(){
  try{
   const rows=await this.backend.list();if(!this.active)return;
   for(const row of rows){const local=this.read(row.id);if(!local?.dirty&&(!local||row.revision>=local.revision))this.write({document:row.document,revision:row.revision,changeId:row.last_change_id,dirty:false,conflict:false});}
   this.error=this.cacheError?this.error:'';
  }catch{this.error='서버 연결 실패. 기기에 남은 기록을 표시합니다. 연결 후 다시 동기화하세요.';}
  finally{this.loading=false;this.emit();}
 }
 async sync(){
  if(!this.active)return;if(this.running)return this.running;
  const work=async()=>{
   // A tab that waited for a Web Lock must reload the latest local revisions.
   this.loadExternal();
   for(const initial of this.dirty()){
    if(!this.active)break;const sent=copy(this.read(initial.document.id));if(sent.conflict)continue;
    try{
     const row=await this.backend.save(sent);if(!this.active)break;
     let latest=this.read(row.id);
     try{const durable=JSON.parse(this.storage.getItem(this.key(row.id)));if(durable&&!this.cacheFailures.has(row.id)&&durable.document.updatedAt>=latest.document.updatedAt)latest=durable;}catch{}
     const unchanged=latest.changeId===sent.changeId;
     this.write({...latest,document:unchanged?row.document:latest.document,revision:row.revision,dirty:!unchanged,conflict:false,error:''});
     this.error=this.cacheError?this.error:'';
    }catch(error){
     const latest=this.read(sent.document.id);
     if(error.code==='40001'){this.write({...latest,conflict:true});this.error='다른 기기의 변경과 충돌했습니다. 두 기록을 확인하고 복구해 주세요.';}
     else {this.error='서버 저장 대기 중입니다. 기기 임시 저장은 유지됩니다. 연결·로그인 상태를 확인하고 다시 동기화하세요.';if(error.code==='P0001')this.error=error.message+' 기기 임시 기록은 유지됩니다.';if(error.code==='42501'||error.code==='28000')this.error='로그인 또는 기록 접근 권한을 확인해 주세요. 입력한 기기 임시 기록은 유지됩니다.';}
     break;
    }
    this.emit();
   }
  };
  this.running=(async()=>{
   try{if(globalThis.navigator?.locks)await navigator.locks.request('ptcare-sync:'+this.owner,work);else await work();}
   finally{this.running=null;this.emit();if(this.active&&this.dirty().some(r=>!r.conflict)&&!this.error)this.schedule();}
  })();return this.running;
 }
 loadExternal(){
  try{for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(key?.startsWith(this.prefix)){const value=JSON.parse(this.storage.getItem(key));const current=this.memory.get(value.document.id);if(!this.cacheFailures.has(value.document.id)&&(!current||value.document.updatedAt>=current.document.updatedAt))this.memory.set(value.document.id,value);}}}catch{this.cacheError=true;}
 }
 async conflictCopy(id){
  const local=this.read(id);if(!local?.conflict)return;
  const doc=copy(local.document);doc.id=crypto.randomUUID();doc.identity.name+=' (기기 복구본)';doc.updatedAt=now();
  this.create(doc);
  // Keep the original conflict untouched until the server's current original has been fetched.
  const rows=await this.backend.list();const row=rows.find(r=>r.id===id);
  if(row)this.write({document:row.document,revision:row.revision,changeId:row.last_change_id,dirty:false,conflict:false});
  this.emit();await this.sync();return doc.id;
 }
 clearCache(){const keys=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(key?.startsWith(this.prefix))keys.push(key);}for(const key of keys)this.storage.removeItem(key);this.memory.clear();this.cacheFailures.clear();this.cacheError=false;}
 stop(){this.active=false;clearTimeout(this.timer);this.listeners.clear();}
}
