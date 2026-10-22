import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises,groups,newChart,newPlanItem,newPerformedItem,recommend,buildProgressNote,noteSource,canReview,assessmentBasis,doseErrors} from '../src/charting/engine.js';
const fixture=()=>{const visit={id:'visit',sequence:1,date:'2026-10-22',forms:{bbs:{answers:{'bbs-0':1,'bbs-1':'skipped'},fields:{},updatedAt:'2026-10-22'}}};const patient={id:'patient',identity:{name:'가상 대상자',birth:'1950-01-01'},visits:[visit]};return {patient,visit};};
test('all 90 source examples are present once across nine ten-item groups',()=>{
 assert.equal(exercises.length,90);assert.equal(new Set(exercises.map(ex=>ex.id)).size,90);assert.equal(groups.length,9);
 for(const group of groups)assert.equal(exercises.filter(ex=>ex.category===group.id).length,10);
 for(const ex of exercises){assert.ok(ex.title.length>0);assert.ok(ex.sentence.length>20);assert.match(ex.sentence,/도모함|도움을 주고자 함/);assert.doesNotMatch(ex.sentence,/\f/);}
});
test('recommendations need therapist confirmation and respect posture, equipment, and precautions',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);
 assert.equal(recommend(patient,visit,chart).items.length,0);
 chart.context={...chart.context,safety:'cleared',capability:'sitting',goals:['일어서기'],equipment:['chair']};
 const result=recommend(patient,visit,chart);assert.ok(result.items.length>0);assert.ok(result.items.every(ex=>ex.minLevel<=1));assert.ok(result.items.every(ex=>!ex.required.includes('band')));assert.ok(result.items.some(ex=>ex.reasons.some(reason=>reason.includes('1/4점'))));
 chart.context.precautions='체중 부하 제한 확인 필요';assert.equal(recommend(patient,visit,chart).items.length,0);
 chart.context.precautions='';chart.context.safety='concern';assert.equal(recommend(patient,visit,chart).items.length,0);
});
test('skipped and unassessed items never become normal findings in the assessment basis',()=>{
 const {patient,visit}=fixture(),basis=assessmentBasis(patient,visit.id);assert.equal(basis[0].complete,false);assert.equal(basis[0].skipped,1);assert.equal(basis[0].items.length,1);assert.equal(basis[0].total,1);assert.equal(basis[0].items[0].id,'bbs-0');
});
test('planning an exercise does not claim it was performed or invent an outcome/dose',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);chart.plan=[newPlanItem('01-01')];
 assert.ok(buildProgressNote(patient,visit,chart).issues.length>0);
 chart.noExerciseReason='검사만 진행함';const result=buildProgressNote(patient,visit,chart);assert.equal(result.issues.length,0);assert.match(result.text,/실시 확인된 운동 없음/);assert.doesNotMatch(result.text,/발목을 위아래로 움직이는 운동을 실시/);assert.doesNotMatch(result.text,/10회|3세트|향상되었/);
});
test('notes contain only confirmed performed exercises; stopped exercises get stopped wording',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);chart.therapist='치료사';chart.beforePain='0';chart.plan=[newPlanItem('09-01')];const performed=newPerformedItem('01-01');performed.reps='7';performed.sets='2';chart.performed=[performed];
 const result=buildProgressNote(patient,visit,chart);assert.equal(result.issues.length,0);assert.match(result.text,/시작 전 통증: 0\/10/);assert.match(result.text,/7회/);assert.match(result.text,/2세트/);assert.match(result.text,/발목을 위아래로 움직이는 운동을 실시/);assert.doesNotMatch(result.text,/주택 주변의 평탄한 길/);assert.match(result.text,/기능 향상 여부는 확인되지 않음/);
 performed.status='stopped';assert.ok(buildProgressNote(patient,visit,chart).issues.length>0);performed.stopReason='피로로 중단';const stopped=buildProgressNote(patient,visit,chart);assert.match(stopped.text,/시도하였으나 중단/);assert.doesNotMatch(stopped.text,/발목을 위아래로 움직이는 운동을 실시하여/);
});
test('review is refused after clinical inputs, patient identity or source evaluation changes',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);chart.therapist='치료사';chart.performed=[newPerformedItem('01-01')];chart.draft=buildProgressNote(patient,visit,chart).text;chart.draftSource=noteSource(patient,visit,chart);assert.deepEqual(canReview(patient,visit,chart),[]);
 chart.response='새 관찰';assert.ok(canReview(patient,visit,chart).some(s=>s.includes('바뀌었습니다')));chart.response='';
 patient.identity.name='다른 이름';assert.ok(canReview(patient,visit,chart).length);patient.identity.name='가상 대상자';
 visit.forms.bbs.answers['bbs-0']=4;assert.ok(canReview(patient,visit,chart).length);
});
test('negative or implausible dose and pain inputs cannot generate a clinical note',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);const performed=newPerformedItem('01-01');chart.performed=[performed];performed.reps='-1';assert.ok(doseErrors(performed).length);assert.ok(buildProgressNote(patient,visit,chart).issues.length);performed.reps='';chart.afterPain='11';assert.ok(buildProgressNote(patient,visit,chart).issues.length);
});
