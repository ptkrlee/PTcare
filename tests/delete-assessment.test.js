import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentDeleteSource,deleteAssessment} from '../src/delete-assessment.js';
import {recordedAssessmentKeys} from '../src/assessment-history.js';
import {formFor,newForm} from '../src/records.js';
const fixture=()=>({identity:{name:'가상 대상자',birth:'1950-01-01'},visits:[{id:'old',date:'2026-11-01',sequence:1,forms:{bbs:{...newForm(),answers:{'bbs-0':4}}}},{id:'current',date:'2026-11-11',sequence:2,forms:{bbs:{...newForm(),answers:{'bbs-0':0},note:'현재 평가',drawings:{'1':[[[1,2]]]}},tug:{...newForm(),fields:{'tug-original':'12'}}},chart:{subjective:'운동기록',photos:[{id:'private-photo'}],history:[{text:'검토본'}]}}]});
test('delete removes just the confirmed form, keeps visits and exercise/other assessments, and refreshes the plan',()=>{
 const p=fixture(),v=p.visits[1],others=JSON.stringify({old:p.visits[0],tug:v.forms.tug,chart:v.chart});const source=assessmentDeleteSource(p,v.id,'bbs');deleteAssessment(p,v.id,'bbs',source);
 assert.equal(v.forms.bbs,undefined);assert.deepEqual(recordedAssessmentKeys(v),['tug']);assert.equal(JSON.stringify({old:p.visits[0],tug:v.forms.tug,chart:v.chart}),others);assert.equal(p.visits.length,2);assert.ok(p.servicePlan.current.sources.some(s=>s.key==='bbs'&&s.sequence===1&&s.date==='2026-11-01'));assert.ok(!p.servicePlan.current.sources.some(s=>s.key==='bbs'&&s.sequence===2));
});
test('confirmation rejects changed data without mutating or deleting the newer values',()=>{
 const p=fixture(),source=assessmentDeleteSource(p,'current','bbs');p.visits[1].forms.bbs.answers['bbs-0']=3;const before=JSON.stringify(p);assert.throws(()=>deleteAssessment(p,'current','bbs',source),/변경/);assert.equal(JSON.stringify(p),before);
});
test('deleting STS removes only its legacy fallback; deleting ASM preserves that STS measurement',()=>{
 for(const key of ['sts','sarcopenia']){
  const p=fixture(),v=p.visits[1];v.forms.sarcopenia={...newForm(),fields:{'asm-chair-5':'12.3','asm-index':'7.1'},updatedAt:'2026-11-01T00:00:00Z'};
  deleteAssessment(p,v.id,key,assessmentDeleteSource(p,v.id,key));
  if(key==='sts'){assert.equal(formFor(v,'sts').fields['sts-five-time'],undefined);assert.equal(v.forms.sarcopenia.fields['asm-index'],'7.1');assert.ok(!recordedAssessmentKeys(v).includes('sts'));}
  else{assert.equal(v.forms.sarcopenia,undefined);assert.equal(formFor(v,'sts').fields['sts-five-time'],'12.3');assert.ok(recordedAssessmentKeys(v).includes('sts'));}
 }
});
