import test from 'node:test';
import assert from 'node:assert/strict';
import {closureSource,assessmentClosed,closureReminder} from '../src/assessment-closure.js';
import {workflowProgress} from '../src/assessment-workflow.js';
import {getAssessment,summarize} from '../src/data.js';
import {newForm} from '../src/records.js';
import {hasAssessmentRecord} from '../src/assessment-history.js';
const status=(a,f)=>workflowProgress(a,f,summarize(a,f.answers,f.fields));
test('BBS reminder names invalid entered times even after all 14 scores were chosen; closing never alters scores',()=>{
 const a=getAssessment('bbs'),f=newForm();for(const item of a.items)f.answers[item.id]=3;f.fields['bbs-1-time-required']='required';f.fields['bbs-1-seconds']='bad';const before=structuredClone({answers:f.answers,fields:f.fields}),s=status(a,f),missing=closureReminder(a,f,s);
 assert.equal(s.answered,14);assert.equal(s.complete,false);assert.ok(missing.some(text=>text.includes(a.items[1].title)&&text.includes('실제 수행 시간')));
 f.closure={at:'2026-11-11T09:00:00Z',by:'therapist',source:closureSource(f),missing};const done=status(a,f);assert.equal(done.closed,true);assert.equal(done.complete,false);assert.equal(done.total,s.total);assert.deepEqual({answers:f.answers,fields:f.fields},before);
 f.fields['bbs-1-seconds']='40';assert.equal(status(a,f).closed,false);
});
test('closure retains skipped answers and makes explicit empty closure visible without inventing zero answers',()=>{
 const a=getAssessment('bbs'),f=newForm();f.answers['bbs-0']='skipped';const s=status(a,f);assert.equal(closureReminder(a,f,s).length,14);f.closure={at:'2026-11-11T09:00:00Z',by:'therapist',source:closureSource(f),missing:closureReminder(a,f,s)};
 assert.equal(f.answers['bbs-0'],'skipped');assert.equal(hasAssessmentRecord({forms:{bbs:f}},'bbs'),true);assert.equal(status(a,f).answered,0);assert.equal(status(a,f).closed,true);assert.equal(status(a,f).complete,false);
});
test('closure fingerprints survive JSON object key ordering and ignore save metadata but reject clinical edits',()=>{
 const a={...newForm(),answers:{b:2,a:0},fields:{y:'3',x:'2'}},b={...a,answers:{a:0,b:2},fields:{x:'2',y:'3'},updatedAt:'another save'};assert.equal(closureSource(a),closureSource(b));a.closure={at:'2026-11-11',by:'owner',source:closureSource(a)};assert.equal(assessmentClosed(a),true);a.note='추가 관찰';assert.equal(assessmentClosed(a),false);
});
test('reminders cover selected clinical sides, default-only TUG, SGDS omissions and MoCA education',()=>{
 const rom=getAssessment('rom'),f=newForm();f.fields={'rom-regions':['knee'],'rom-knee-flex-right':'Full'};const r=closureReminder(rom,f,status(rom,f));assert.ok(r.some(x=>x.includes('왼쪽')));assert.ok(!r.some(x=>x.includes('실제 각도')));
 for(const key of ['tug','sgds','moca-k']){const a=getAssessment(key),f=newForm();assert.ok(closureReminder(a,f,status(a,f)).length>0);}
});
