import test from 'node:test';
import assert from 'node:assert/strict';
import approved from '../src/charting/approved-exercises.json' with {type:'json'};
import {exercises,newPlanItem,newPerformedItem,newChart,recommend,performedNarrative} from '../src/charting/engine.js';
const expected='P01-09 P02-05 P02-08 P03-01 P03-09 P04-03 P04-04 P05-01 P05-02 P05-03 P05-08 P06-03 P06-04 P06-08 P06-09 P07-01 P07-02 P07-04 P07-05 P07-06 P07-07 P07-09 P07-10 P08-01 P08-02 P08-03 P08-04 P08-08 P09-02 P09-04 P09-06'.split(' ');
test('exactly the 31 selected proposals have stable unique catalog IDs and revised movement names',()=>{
 assert.deepEqual(approved.map(ex=>ex.approval.proposalId),expected);assert.equal(exercises.length,128);assert.equal(new Set(exercises.map(ex=>ex.id)).size,128);
 for(const ex of approved){assert.ok(exercises.some(x=>x.id===ex.id));assert.ok(ex.method&&ex.cue);assert.match(ex.approval.evidence,/원문 대조 대기/);}
 const by=p=>approved.find(ex=>ex.approval.proposalId===p);assert.match(by('P02-08').title,/앞뒤/);assert.match(by('P03-01').title,/뒤꿈치 들기–발끝 들기/);assert.match(by('P05-08').title,/목표지점/);assert.doesNotMatch(by('P05-08').title,/앞으로/);
});
test('approved methods populate editable plans; actual methods and doses stay blank until confirmation',()=>{
 const ex=approved.find(ex=>ex.approval.proposalId==='P03-01'),plan=newPlanItem(ex.id),actual=newPerformedItem(ex.id);
 assert.equal(plan.method,ex.method);assert.equal(plan.cue,ex.cue);assert.equal(plan.side,'both');assert.equal(plan.reps,'10');assert.equal(plan.sets,'3');assert.equal(plan.seconds,'3');
 for(const key of ['method','cue','sets','reps','seconds','minutes'])assert.equal(actual[key],'');actual.reps='7';actual.sets='2';actual.method='고정된 의자에서 시행';assert.match(performedNarrative(actual),/7회/);assert.match(performedNarrative(actual),/고정된 의자/);assert.doesNotMatch(performedNarrative(actual),/10회/);
});
test('new recommendations honor source-specific support and tools; advanced and dual tasks remain manual',()=>{
 const visit={id:'v',date:'2026-11-11',sequence:1,forms:{}},patient={identity:{birth:'1950-01-01'},visits:[visit]},chart=newChart(visit.date);
 chart.context={...chart.context,safety:'cleared',capability:'outdoor',equipment:[],goals:['상지 움직임','하지 근력']};assert.ok(recommend(patient,visit,chart).items.every(ex=>!ex.required.length&&!ex.manualOnly));
 chart.context.equipment=['chair','bed','support','ball','floor','target','sound','obstacle','rail','daily','step'];
 const rec=recommend(patient,visit,chart);assert.ok(rec.items.every(ex=>!ex.manualOnly));
 for(const pid of ['P01-09','P07-02','P07-05','P07-09','P07-10'])assert.ok(exercises.find(ex=>ex.approval?.proposalId===pid).manualOnly);
 const target=exercises.find(ex=>ex.approval?.proposalId==='P05-08');assert.equal(target.minLevel,4);assert.ok(target.required.includes('support'));assert.ok(target.required.includes('target'));
});
