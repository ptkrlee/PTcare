import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPerformedItem,newPlanItem,newChart,performedNarrative,confirmPlannedPerformance,buildProgressNote,noteSource,noteFormatVersion} from '../src/charting/engine.js';
import {servicePrintContent,renderServiceNarratives} from '../src/charting/service-record.js';
const fixture=()=>{const visit={id:'v',date:'2026-10-27',sequence:1,forms:{}},patient={id:'p',identity:{name:'가상 대상자',birth:'1950-01-01'},visits:[visit]},chart=newChart(visit.date);return {patient,visit,chart};};
test('actual narrative composes explicit method, dose, direction, support, response and memo with no invented benefits',()=>{
 const row={...newPerformedItem('01-06'),reps:'10',sets:'3',seconds:'3',minutes:'5',assistance:'최소 도움',method:'무릎을 세운 바로누운 자세에서 골반 들기',reaction:'통증 2/10으로 기록함',memo:'골반 높이를 낮추어 시행'};
 const text=performedNarrative(row);for(const part of ['브리지 운동을 10회씩 3세트 5분간 최소 도움하에 실시함.','수행 방법: 무릎을 세운 바로누운 자세에서 골반 들기.','유지시간: 회당 3초.','실제 반응: 통증 2/10으로 기록함.','기타사항: 골반 높이를 낮추어 시행.'])assert.ok(text.includes(part),part);
 assert.doesNotMatch(text,/향상을 도모|호전|안정적으로|통증 없이/);
 const left={...row,exerciseId:'01-01',side:'left',minutes:''};assert.match(performedNarrative(left),/왼쪽 10회씩 3세트/);assert.doesNotMatch(performedNarrative(left),/좌우 각/);
});
test('blank doses and unknown statuses never become default completed sets and stopped/unperformed notes remain distinct',()=>{
 const row=newPerformedItem('01-01');assert.doesNotMatch(performedNarrative(row),/10회|3세트|3초|undefined|null|유지시간|기타사항/);assert.match(performedNarrative({...row,status:'unexpected'}),/수행 상태 확인 필요/);assert.doesNotMatch(performedNarrative({...row,status:'unexpected'}),/실시함/);
 Object.assign(row,{reps:'4',sets:'1',status:'stopped',stopReason:'어지럼 호소',memo:'앉아서 휴식'});assert.match(performedNarrative(row),/4회씩 1세트 시도하였으나 중단함/);assert.match(performedNarrative(row),/중단 사유: 어지럼 호소/);
 row.status='notdone';assert.match(performedNarrative(row),/실시하지 않음/);assert.doesNotMatch(performedNarrative(row),/4회|1세트/);
 row.status='done';row.reps='-5';assert.doesNotMatch(performedNarrative(row),/-5회/);assert.match(performedNarrative(row),/반복 입력을 확인/);
});
test('plans only become actual doses after an explicit confirmation and never override observed reactions',()=>{
 const plan={...newPlanItem('01-01'),reps:'12',method:'앉아서 발목 굽힘·폄',memo:'천천히',assistance:'접촉 보조'},actual={...newPerformedItem('01-01'),reaction:'직접 관찰한 반응'};
 assert.equal(actual.reps,'');assert.equal(confirmPlannedPerformance(actual,plan,'2026-10-27T01:00:00Z'),true);assert.equal(actual.reps,'12');assert.equal(actual.method,plan.method);assert.equal(actual.memo,'천천히');assert.equal(actual.reaction,'직접 관찰한 반응');assert.equal(actual.planConfirmedAt,'2026-10-27T01:00:00Z');
 assert.equal(confirmPlannedPerformance({...actual,status:'stopped'},plan),false);assert.equal(confirmPlannedPerformance(actual,{...plan,reps:'-1'}),false);assert.equal(confirmPlannedPerformance(actual,{...plan,exerciseId:'01-06'}),false);
});
test('live preview, service print and progress draft share actual content and escape user text in HTML',()=>{
 const {patient,visit,chart}=fixture();chart.plan=[{...newPlanItem('01-06'),reps:'99'}];const row={...newPerformedItem('01-06'),reps:'7',sets:'2',method:'무릎을 세우고 시행',memo:'<script>alert(1)</script>'};chart.performed=[row];
 const text=performedNarrative(row),draft=buildProgressNote(patient,visit,chart).text,service=servicePrintContent(patient,visit,chart,[]),preview=renderServiceNarratives(chart);
 assert.ok(draft.includes(text));assert.ok(service.includes('7회씩 2세트'));assert.ok(preview.includes('7회씩 2세트'));assert.doesNotMatch(service,/<script>/);assert.doesNotMatch(draft,/99회/);assert.match(service,/&lt;script&gt;/);
 assert.ok(noteSource(patient,visit,chart).includes(noteFormatVersion));const oldSource=noteSource(patient,visit,chart);row.method='옆으로 누워 시행';assert.notEqual(noteSource(patient,visit,chart),oldSource);
});
