import test from 'node:test';
import assert from 'node:assert/strict';
import {TemporaryStore} from '../src/temporary-store.js';
import {newPatient,formFor} from '../src/records.js';
import {canStoreRecords} from '../src/access-policy.js';
test('general/unverified evaluations use RAM only and are discarded on stop/recreation',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('temporary evaluations must not access storage');}});
 try{const store=new TemporaryStore('general');const patient=store.create(newPatient({name:'가상 이름',birth:'1950-01-01'},'2026-10-22'));store.update(patient.id,doc=>doc.visits[0].forms.bbs={answers:{'bbs-0':4}});await store.sync();await store.refresh();assert.equal(store.read(patient.id).document.visits[0].forms.bbs.answers['bbs-0'],4);assert.deepEqual(store.dirty(),[]);store.stop();assert.equal(store.documents().length,0);assert.equal(new TemporaryStore('general').documents().length,0);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
 assert.equal(canStoreRecords({member_type:'general',approved:true}),false);assert.equal(canStoreRecords({member_type:'therapist',approved:false}),false);assert.equal(canStoreRecords({member_type:'therapist',approved:true}),true);
});
test('TUG starts with 3m while explicit edits/clearing persist, and legacy chair time appears under STS',()=>{
 const visit={forms:{sarcopenia:{fields:{'asm-chair-5':'15.3','asm-walk-6m':'6'}}}};
 assert.equal(formFor(visit,'tug').fields['tug-distance'],'3');visit.forms.tug={fields:{'tug-distance':'4'}};assert.equal(formFor(visit,'tug').fields['tug-distance'],'4');visit.forms.tug.fields['tug-distance']='';assert.equal(formFor(visit,'tug').fields['tug-distance'],'');
 assert.equal(formFor(visit,'sts').fields['sts-five-time'],'15.3');assert.equal(visit.forms.sarcopenia.fields['asm-chair-5'],'15.3');visit.forms.sts={fields:{'sts-five-time':''}};assert.equal(formFor(visit,'sts').fields['sts-five-time'],'');
});
