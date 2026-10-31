import {test} from 'node:test';
import assert from 'node:assert/strict';
import {casePatterns,reviewedExperience,methodExamples} from '../src/charting/case-learning.js';
import {newChart,newPerformedItem,newPlanItem,recommend,noteSource,buildProgressNote,performedNarrative} from '../src/charting/engine.js';
const current={id:'v2',sequence:2,date:'2026-10-31',forms:{}};
const prior={id:'v1',sequence:1,date:'2026-10-25',forms:{}};
const fixture=()=>{const patient={id:'p',identity:{name:'합성 테스트 대상자',birth:'1950-01-01'},visits:[structuredClone(prior),structuredClone(current)]},chart=newChart(current.date);chart.context={...chart.context,safety:'cleared',capability:'walking',equipment:['bed','chair','support','band','walker'],goals:['침상 이동']};return {patient,visit:patient.visits[1],chart};};
function review(patient,feedback,exerciseId='01-06',extras={}){const visit=patient.visits[0],chart=newChart(visit.date);chart.performed=[{...newPerformedItem(exerciseId),feedback,method:'합성된 테스트 방법',cue:'테스트 단서',...extras}];chart.context.equipment=['bed'];chart.context.capability='bed';const snapshot={id:'review-1',at:'2026-10-26T01:00:00Z',byName:'테스트 치료사',byAccount:'owner',source:noteSource(patient,visit,chart)};visit.chart={...chart,history:[snapshot],reviewed:snapshot};return {snapshot,chart};}
test('anonymized patterns map to valid movements without copying case diagnoses, outcomes or doses',()=>{
 assert.equal(casePatterns.length,12);assert.equal(new Set(casePatterns.map(x=>x.id)).size,12);
 for(const item of casePatterns){assert.ok(item.method);assert.ok(item.cue);assert.ok(item.exerciseIds.length);assert.doesNotMatch(JSON.stringify(item),/성명|생년|소뇌|병변|10회|10초|진전이 감소|향상되었/);}
});
test('only prior, patient-matched reviewed feedback is reused; draft, other-patient, future and duplicate sources are excluded',()=>{
 const {patient,visit}=fixture();review(patient,'suitable');let learned=reviewedExperience(patient,visit);assert.equal(learned.reviewCount,1);assert.equal(learned.byExercise.get('01-06').feedback,'suitable');assert.equal(learned.feedbackCount,1);
 assert.equal(reviewedExperience(patient,visit,{enabled:false}).reviewCount,0);
 const draft=structuredClone(patient);draft.visits[0].chart.history=[];draft.visits[0].chart.reviewed=null;assert.equal(reviewedExperience(draft,visit).byExercise.size,0);
 const foreign=structuredClone(patient);for(const s of [foreign.visits[0].chart.history[0],foreign.visits[0].chart.reviewed]){const source=JSON.parse(s.source);source.patientId='different-patient';s.source=JSON.stringify(source);}assert.equal(reviewedExperience(foreign,visit).byExercise.size,0);
 const future=structuredClone(patient);future.visits[0].date='2026-11-01';assert.equal(reviewedExperience(future,visit).reviewCount,0);
});
test('explicit feedback changes next recommendations, while current safety/posture/tool gates and opt-out remain effective',()=>{
 const {patient,visit,chart}=fixture();const baseline=recommend(patient,visit,chart).items.map(x=>x.id);assert.ok(baseline.length);
 review(patient,'avoid',baseline[0]);let rec=recommend(patient,visit,chart);assert.ok(!rec.items.some(x=>x.id===baseline[0]));assert.equal(rec.experience.excluded,1);
 chart.context.useReviewedHistory=false;assert.deepEqual(recommend(patient,visit,chart).items.map(x=>x.id),baseline);
 chart.context.useReviewedHistory=true;chart.context.safety='concern';assert.equal(recommend(patient,visit,chart).items.length,0);
 chart.context.safety='cleared';chart.context.capability='bed';chart.context.equipment=[];assert.ok(recommend(patient,visit,chart).items.every(x=>x.required.length===0));
});
test('reviewed methods are offered only as explicit same-patient plan examples and adverse/unfinished movements do not receive positive reuse',()=>{
 const {patient,visit}=fixture();review(patient,'suitable');const methods=methodExamples(patient,visit,'01-06');assert.match(methods[0].title,/1회차/);assert.equal(methods[0].method,'합성된 테스트 방법');assert.ok(methodExamples(patient,visit,'01-06',{enabled:false}).every(x=>!x.id.startsWith('reviewed-')));
 const {patient:p2,visit:v2}=fixture();review(p2,'suitable','01-06',{status:'stopped',stopReason:'어지럼'});assert.equal(reviewedExperience(p2,v2).byExercise.size,0);
});
test('new explicit cue, compensation and adjustment reach clinical drafts while blank observations remain absent',()=>{
 const {patient,visit,chart}=fixture();const row={...newPerformedItem('01-06'),reps:'8',sets:'2',cue:'무릎 방향을 맞추도록 설명',compensation:'허리 과도한 폄 관찰',adjustment:'골반 높이를 낮추어 시행',feedback:'adjust'};chart.performed=[row];
 const text=performedNarrative(row);for(const phrase of ['제공한 단서·설명: 무릎 방향','관찰한 보상동작: 허리','현장 조정: 골반','다음 회차 검토: 다음 회차 조정 필요'])assert.ok(text.includes(phrase));assert.ok(buildProgressNote(patient,visit,chart).text.includes(text));
 assert.doesNotMatch(performedNarrative(newPerformedItem('01-06')),/보상동작|현장 조정|제공한 단서|적합/);
 const plan=newPlanItem('01-06');assert.equal(plan.reps,'10');assert.equal(plan.sets,'3');assert.equal(plan.seconds,'3');
});
test('case-derived current focus changes relevant candidates without fabricating a method or observations',()=>{
 const {patient,visit,chart}=fixture();const before=recommend(patient,visit,chart).items.map(x=>x.id);chart.context.caseFocus=['동작 조절·협응'];const after=recommend(patient,visit,chart);assert.ok(after.items.some(x=>x.id==='01-02'));assert.notDeepEqual(after.items.map(x=>x.id),before);assert.ok(after.items.some(x=>x.reasons.some(reason=>reason.includes('현재 중점과 사례 패턴'))));assert.equal(chart.performed.length,0);assert.equal(chart.plan.length,0);
});
test('later review timestamps and rising pain cannot be used as earlier positive clinical feedback',()=>{
 const {patient,visit}=fixture();const {snapshot,chart}=review(patient,'suitable');snapshot.at='2026-11-02T00:00:00Z';assert.equal(reviewedExperience(patient,visit).byExercise.size,0);
 snapshot.at='2026-10-26T00:00:00Z';chart.beforePain='1';chart.afterPain='4';snapshot.source=noteSource(patient,patient.visits[0],chart);assert.equal(reviewedExperience(patient,visit).byExercise.size,0);
});
test('a late edit of an older service does not override newer reviewed care feedback',()=>{
 const {patient,visit}=fixture();review(patient,'suitable');patient.visits[0].chart.history[0].at='2026-10-30T00:00:00Z';
 const newer={id:'newer-prior',sequence:2,date:'2026-10-28',forms:{}},chart=newChart(newer.date);chart.performed=[{...newPerformedItem('01-06'),feedback:'avoid'}];const snapshot={id:'review-2',at:'2026-10-29T00:00:00Z',byAccount:'owner',byName:'테스트 치료사',source:noteSource(patient,newer,chart)};newer.chart={...chart,history:[snapshot]};patient.visits.splice(1,0,newer);visit.sequence=3;
 assert.equal(reviewedExperience(patient,visit).byExercise.get('01-06').feedback,'avoid');
});
test('malformed legacy source or history is ignored; opt-out also suppresses a precomputed experience',()=>{
 const {patient,visit}=fixture(),{snapshot}=review(patient,'suitable');const experience=reviewedExperience(patient,visit);assert.ok(methodExamples(patient,visit,'01-06',{experience}).some(x=>x.id.startsWith('reviewed-')));assert.ok(methodExamples(patient,visit,'01-06',{experience,enabled:false}).every(x=>!x.id.startsWith('reviewed-')));
 snapshot.source='null';assert.equal(reviewedExperience(patient,visit).byExercise.size,0);patient.visits[0].chart.history={invalid:true};assert.equal(reviewedExperience(patient,visit).byExercise.size,0);
});
