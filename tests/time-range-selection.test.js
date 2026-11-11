import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreSPPB} from '../src/clinical-scoring.js';
import {timeBands,criterionState,timeRequired} from '../src/timed-criteria.js';
import {workflowProgress} from '../src/assessment-workflow.js';
import {unresolvedTargets} from '../src/assessment-closure.js';
import {hasAssessmentRecord} from '../src/assessment-history.js';
import {getAssessment,summarize} from '../src/data.js';
const status=(key,fields)=>{const a=getAssessment(key),f={answers:{},fields};return workflowProgress(a,f,summarize(a,f.answers,fields));};
test('all SPPB score bands determine scores without actual seconds or fabricated walking speeds',()=>{
 for(const distance of [3,4])for(const gait of ['passed','range-3','range-2','range-1'])for(const chair of ['passed','range-3','range-2','range-1','range-0'])for(const tandem of ['passed','range-1','range-0']){
  const fields={'sppb-distance':String(distance),'sppb-side-criterion':'passed','sppb-semi-criterion':'passed','sppb-tandem-criterion':tandem,'sppb-gait-1-criterion':gait,'sppb-chair-time-criterion':chair,'sppb-chair-single':'팔 사용 없이 가능'},before=JSON.stringify(fields),s=status('sppb',fields),scores=scoreSPPB(fields);
  assert.equal(s.complete,true);assert.equal(s.total,2+(tandem==='passed'?2:Number(tandem.slice(-1)))+(gait==='passed'?4:Number(gait.slice(-1)))+(chair==='passed'?4:Number(chair.slice(-1))));assert.equal(scores['sppb-gait'].best,undefined);assert.equal(JSON.stringify(fields),before);
 }
});
test('unambiguous below-threshold choices complete without time, while an ambiguous legacy band still needs seconds',()=>{
 for(const id of ['sppb-side','sppb-semi','ols-open-right','ols-closed-left']){const f={[id+'-criterion']:'below'};assert.equal(criterionState(id,f).valid,true);assert.equal(timeRequired(id,f),false);assert.equal(hasAssessmentRecord({forms:{'one-leg':{answers:{},fields:f}}},'one-leg'),id.startsWith('ols-'));}
 const f={'sppb-tandem-criterion':'below'};assert.equal(criterionState('sppb-tandem',f).valid,false);assert.equal(timeRequired('sppb-tandem',f),true);
 assert.equal(status('one-leg',Object.fromEntries(getAssessment('one-leg').fields.map(field=>[field.id+'-criterion','below']))).complete,true);
});
test('explicit range and numeric contradictions, illegal durations and boundary gaps never silently produce points',()=>{
 for(const distance of [3,4])for(const id of ['sppb-tandem','sppb-gait-1','sppb-chair-time'])for(const band of timeBands(id,{'sppb-distance':String(distance)})){
  const f={'sppb-distance':String(distance),[id+'-criterion']:band.value};assert.equal(criterionState(id,f).valid,true);for(const value of [band.min+(band.minOpen?0.01:0),band.max-(band.maxOpen?0.01:0)]){f[id]=value.toFixed(2);assert.equal(criterionState(id,f).valid,true,`${id} ${band.value} ${value}`);}f[id]='6034';assert.equal(criterionState(id,f).valid,false);
 }
 const f={'sppb-side-criterion':'passed','sppb-semi-criterion':'passed','sppb-tandem-criterion':'range-1','sppb-tandem':'6034'};const s=status('sppb',f),entries=unresolvedTargets(getAssessment('sppb'),{answers:{},fields:f},s);assert.ok(entries.some(entry=>entry.id==='sppb-tandem'));assert.equal(s.complete,false);
});
test('one timed gait attempt and one bucket use the higher score without inventing a representative time',()=>{
 const r=scoreSPPB({'sppb-distance':'4','sppb-gait-1':'9','sppb-gait-2-criterion':'range-3'})['sppb-gait'];assert.equal(r.score,3);assert.equal(r.best,undefined);
});

test('unresolved links identify the failing BBS rotation side rather than the valid side',()=>{
 const a=getAssessment('bbs'),f={answers:Object.fromEntries(a.items.map(item=>[item.id,4])),fields:{'bbs-10-seconds-right':'3','bbs-10-seconds-left':'9'}},s=workflowProgress(a,f,summarize(a,f.answers,f.fields));assert.equal(s.complete,false);assert.ok(unresolvedTargets(a,f,s).some(entry=>entry.id==='bbs-10-seconds-left'));
});
