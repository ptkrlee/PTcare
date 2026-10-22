// Evaluation-only mode: patient details/answers exist in RAM, never localStorage or a backend.
export class TemporaryStore{
 constructor(owner){this.owner=owner;this.temporary=true;this.active=true;this.loading=false;this.error='';this.cacheError=false;this.prefix='__ptcare_ephemeral_no_storage__';this.memory=new Map();this.listeners=new Set();}
 onChange(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 emit(){if(this.active)for(const fn of this.listeners)fn();}
 read(id){return this.memory.get(id);}
 documents(){return [...this.memory.values()].map(row=>row.document);}
 create(document){this.memory.clear();this.memory.set(document.id,{document,revision:0});this.emit();return document;}
 update(id,mutator){const current=this.read(id);if(!current)throw new Error('평가 정보를 다시 입력해 주세요.');const document=structuredClone(current.document);mutator(document);document.updatedAt=new Date().toISOString();this.memory.set(id,{document,revision:0});this.emit();return document;}
 dirty(){return [];}
 async sync(){}
 async refresh(){}
 loadExternal(){}
 clearCache(){this.memory.clear();this.emit();}
 stop(){this.active=false;this.memory.clear();this.listeners.clear();}
}
