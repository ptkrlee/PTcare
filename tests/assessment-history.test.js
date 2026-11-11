import test from 'node:test';
import assert from 'node:assert/strict';
import {newForm,formFor} from '../src/records.js';
import {hasAssessmentRecord,recordedAssessmentKeys,assessmentHistory,latestAssessmentDate} from '../src/assessment-history.js';
const visit=(forms={},date='2026-11-11')=>({id:date,date,sequence:1,forms});
test('empty, chart-only, visited, reset and skipped-only forms do not create assessment history',()=>{
 for(const v of [visit(),{...visit(),chart:{subjective:'운동만 시행'}},visit({bbs:newForm()}),visit({bbs:{...newForm(),answers:{'bbs-0':'skipped'}}}),visit({tug:{...newForm(),fields:{'tug-distance':'3'}}}),visit({rom:{...newForm(),fields:{'rom-regions':['knee'],'rom-mode':'능동 (AROM)'}}})])assert.deepEqual(recordedAssessmentKeys(v),[]);
 const v=visit();formFor(v,'tug');assert.deepEqual(v.forms,{});assert.equal(hasAssessmentRecord(v,'tug'),false);
});
test('zero scores, partial measurements, actual inability and criterion-only passes remain visible',()=>{
 assert.equal(hasAssessmentRecord(visit({bbs:{...newForm(),answers:{'bbs-0':0}}}),'bbs'),true);
 assert.equal(hasAssessmentRecord(visit({tug:{...newForm(),fields:{'tug-original':'8.4'}}}),'tug'),true);
 assert.equal(hasAssessmentRecord(visit({sppb:{...newForm(),fields:{'sppb-balance-status':'수행 불가'}}}),'sppb'),true);
 assert.equal(hasAssessmentRecord(visit({'one-leg':{...newForm(),fields:{'ols-open-right-criterion':'passed'}}}),'one-leg'),true);
 assert.equal(hasAssessmentRecord(visit({rom:{...newForm(),fields:{'rom-knee-flex-right':'Full'}}}),'rom'),true);
 assert.equal(hasAssessmentRecord(visit({sarcopenia:{...newForm(),fields:{'asm-chair-5':'12.3'}}}),'sts'),true);
});
test('note and drawing drafts are retained; metadata and erased drawings are not assessment results',()=>{
 assert.equal(hasAssessmentRecord(visit({'moca-k':{...newForm(),fields:{'moca-k-education':'6','moca-k-examiner':'치료사'}}}),'moca-k'),false);
 assert.equal(hasAssessmentRecord(visit({'moca-k':{...newForm(),drawings:{'1':[[[1,2],[3,4]]]}}}),'moca-k'),true);
 assert.equal(hasAssessmentRecord(visit({'moca-k':{...newForm(),drawings:{'1':[]},drawingHistory:[{strokes:[1]}]}}),'moca-k'),false);
 assert.equal(hasAssessmentRecord(visit({bbs:{...newForm(),note:'균형 평가를 이어서 시행 예정'}}),'bbs'),true);
});
test('history and its latest date use only assessed visits, preserve visit numbering, and never mutate saved data',()=>{
 const a=visit({bbs:{...newForm(),answers:{'bbs-0':0}}},'2026-11-01'),b={...visit({},'2026-11-11'),sequence:2,chart:{subjective:'운동만 시행'}},patient={visits:[a,b]},before=JSON.stringify(patient);
 assert.deepEqual(assessmentHistory(patient).map(x=>[x.visit.sequence,x.keys]),[[1,['bbs']]]);assert.equal(latestAssessmentDate(patient),'2026-11-01');assert.equal(JSON.stringify(patient),before);
});
