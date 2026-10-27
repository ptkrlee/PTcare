import test from 'node:test';
import assert from 'node:assert/strict';
import {getAssessment,summarize} from '../src/data.js';
import {basicComplete,basicSafety,nrsValid,sgdsInterpretation} from '../src/basic-assessment.js';
import {deriveServicePlan,syncServicePlan,latestAssessments,defaultSessions} from '../src/service-plan.js';
import {newPatient,newForm,newVisit} from '../src/records.js';
const patient=()=>newPatient({name:'테스트',birth:'1950-01-01'},'2026-10-27');
test('SGDS-K has exactly 15 items and reverse scoring follows the supplied asterisks',()=>{
 const a=getAssessment('sgds');assert.equal(a.items.length,15);const yes=Object.fromEntries(a.items.map(x=>[x.id,x.options.find(o=>o.label==='예').score]));assert.equal(summarize(a,yes).total,10);const no=Object.fromEntries(a.items.map(x=>[x.id,x.options.find(o=>o.label==='아니오').score]));assert.equal(summarize(a,no).total,5);for(const i of [0,4,6,10,12])assert.equal(yes['sgds-'+i],0);
 for(const [n,pattern] of [[4,/0–4/],[5,/5–9/],[9,/5–9/],[10,/10–15/],[15,/10–15/]])assert.match(sgdsInterpretation({complete:true,total:n}),pattern);assert.match(sgdsInterpretation({complete:false,total:15}),/보류/);
});
test('basic assessment keeps distinct pain conditions, conditional night pain and explicit safety findings',()=>{
 assert.equal(getAssessment('basic').max,null);assert.equal(nrsValid(''),false);assert.equal(nrsValid(0),true);assert.equal(nrsValid(11),false);assert.equal(nrsValid(false),false);assert.equal(nrsValid([]),false);
 const f={fields:{'basic-falls':'없음','basic-neuro':'없음','basic-vitals':'양호','basic-pain-impact':'없음','basic-symptoms':['없음'],'basic-confirmations':getAssessment('basic').fields.find(x=>x.id==='basic-confirmations').options,'basic-before-pain':0,'basic-pain-current':0,'basic-pain-rest':0,'basic-pain-activity':2}};assert.equal(basicComplete(f),true);assert.deepEqual(basicSafety(f.fields),[]);f.fields['basic-pain-patterns']=['야간 통증'];assert.equal(basicComplete(f),false);f.fields['basic-pain-night']='5';assert.equal(basicComplete(f),true);f.fields['basic-symptoms']=['흉통'];assert.deepEqual(basicSafety(f.fields),['흉통']);f.fields['basic-symptoms']=['없음','흉통'];assert.equal(basicComplete(f),false);
});
test('service plans preserve actual assessment dates, update reflection timestamps only on changed inputs, and keep reviewed history',()=>{
 const p=patient(),f=newForm();f.answers={'bbs-0':0};f.updatedAt='2026-10-27T01:00:00Z';p.visits[0].forms.bbs=f;assert.equal(syncServicePlan(p,'2026-10-27T01:01:00Z'),true);assert.equal(p.servicePlan.current.latestAssessmentUpdatedAt,f.updatedAt);assert.equal(p.servicePlan.current.sources[0].complete,false);assert.match(p.servicePlan.current.sources[0].text,/미완료 부분/);assert.equal(syncServicePlan(p,'2026-10-28T00:00:00Z'),false);assert.equal(p.servicePlan.current.reflectedAt,'2026-10-27T01:01:00Z');
 p.servicePlan.current.status='reviewed';p.servicePlan.history.push(structuredClone(p.servicePlan.current));f.answers['bbs-1']=4;f.updatedAt='2026-10-28T01:00:00Z';assert.equal(syncServicePlan(p,'2026-10-28T01:01:00Z'),true);assert.equal(p.servicePlan.current.status,'draft');assert.equal(p.servicePlan.history[0].status,'reviewed');assert.equal(p.servicePlan.current.latestAssessmentUpdatedAt,'2026-10-28T01:00:00Z');assert.equal(p.servicePlan.current.sources[0].date,'2026-10-27');assert.equal(defaultSessions.length,8);assert.ok(defaultSessions.every(x=>x.minutes===40));
});
test('latest assessment selection does not create unentered tools or clinical findings from an empty default form',()=>{
 const p=patient();p.visits[0].forms.tug=newForm();assert.equal(latestAssessments(p).length,0);assert.equal(deriveServicePlan(p).sources.length,0);const v=newVisit('2026-10-28',2);p.visits.push(v);const f=newForm();f.fields={'basic-pain-rest':'3','basic-diagnoses':'skipped'};v.forms.basic=f;assert.doesNotThrow(()=>deriveServicePlan(p));
});
