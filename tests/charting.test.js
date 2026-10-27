import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises,groups,newChart,newPlanItem,newPerformedItem,recommend,buildProgressNote,noteSource,canReview,assessmentBasis,doseErrors,chartFor,doseText} from '../src/charting/engine.js';
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
test('new plans default to adjustable 10 repetitions, three sets, three-second holds and side-specific repetitions',()=>{
 const row=newPlanItem('01-01');assert.equal(row.reps,'10');assert.equal(row.sets,'3');assert.equal(row.seconds,'3');assert.equal(row.side,'both');assert.match(doseText(row),/좌우 각 10회/);
 row.reps='8';row.side='left';assert.match(doseText(row),/왼쪽 8회/);assert.equal(newPlanItem('04-04').side,'total');
 const actual=newPerformedItem('01-01');for(const field of ['sets','reps','seconds','minutes'])assert.equal(actual[field],'');
});
test('selected plans generate a plan without claiming actual performance; blank fields are omitted',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);chart.plan=[newPlanItem('01-01')];
 const result=buildProgressNote(patient,visit,chart);assert.deepEqual(result.issues,[]);assert.match(result.text,/운동 계획/);assert.match(result.text,/좌우 각 10회/);assert.match(result.text,/3세트/);assert.match(result.text,/유지 시간 3초/);assert.doesNotMatch(result.text,/실제 수행 운동|운동을 실시|미기록|미입력|기능 향상 여부/);
 chart.plan=[];chart.subjective='피로를 호소함';chart.homework='의자에서 발목 운동';chart.nextVisitDate='2026-10-29';chart.nextVisitTime='14:30';chart.nextPlan='보행 재평가';
 const note=buildProgressNote(patient,visit,chart);assert.deepEqual(note.issues,[]);assert.match(note.text,/피로를 호소함/);assert.match(note.text,/운동과제 \(운동숙제\)/);assert.match(note.text,/2026-10-29 14:30/);assert.doesNotMatch(note.text,/실제 수행 운동|운동 계획|실제 반응|미기록/);
});
test('notes distinguish confirmed, stopped and explicitly unperformed movements without inventing findings',()=>{
 const {patient,visit}=fixture(),chart=newChart(visit.date);chart.therapist='치료사';chart.beforePain='0';chart.plan=[newPlanItem('01-01')];const performed=newPerformedItem('01-01');performed.reps='7';performed.sets='2';chart.performed=[performed];
 const result=buildProgressNote(patient,visit,chart);assert.equal(result.issues.length,0);assert.match(result.text,/시작 전 통증: 0\/10/);assert.match(result.text,/7회/);assert.match(result.text,/2세트/);assert.match(result.text,/발목 굽힘·폄 운동을 좌우 각 7회씩 2세트 실시함/);assert.doesNotMatch(result.text,/10회|3세트|미기록|기능 향상 여부/);
 performed.status='stopped';assert.deepEqual(buildProgressNote(patient,visit,chart).issues,[]);performed.stopReason='피로로 중단';const stopped=buildProgressNote(patient,visit,chart);assert.match(stopped.text,/시도하였으나 중단/);assert.match(stopped.text,/피로로 중단/);assert.doesNotMatch(stopped.text,/발목을 위아래로 움직이는 운동을 실시하여/);
 performed.status='notdone';assert.match(buildProgressNote(patient,visit,chart).text,/실시하지 않음/);assert.doesNotMatch(buildProgressNote(patient,visit,chart).text,/7회/);
});
test('legacy education is preserved as homework and optional appointment dates are validated',()=>{
 const {patient,visit}=fixture();visit.chart={education:'기존 교육 내용',plan:[{...newPlanItem('01-01'),reps:'8'}]};const chart=chartFor(visit);assert.equal(chart.homework,'기존 교육 내용');assert.equal(chart.plan[0].reps,'8');assert.match(buildProgressNote(patient,visit,chart).text,/기존 교육 내용/);
 chart.nextVisitDate='2026-02-30';assert.ok(buildProgressNote(patient,visit,chart).issues.length);chart.nextVisitDate='';chart.nextVisitTime='25:00';assert.ok(buildProgressNote(patient,visit,chart).issues.length);chart.nextVisitTime='14:00';assert.deepEqual(buildProgressNote(patient,visit,chart).issues,[]);
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

test('automatic charting includes only resolved partial assessment results, not prompts for unanswered measurements',()=>{
 const {patient,visit}=fixture();visit.forms={sppb:{answers:{},fields:{'sppb-side':'9'}}};const chart=newChart(visit.date);const result=buildProgressNote(patient,visit,chart);assert.match(result.text,/미완료 부분 점수 0\/12/);assert.match(result.text,/균형 검사: 0 \/ 4점/);assert.doesNotMatch(result.text,/시간을 입력하세요|점수 미확정|팔을 사용하지 않고/);
});
