import test from 'node:test';
import assert from 'node:assert/strict';
import {getAssessment,summarize} from '../src/data.js';
import {scoreSPPB} from '../src/clinical-scoring.js';
import {criterionState,modeKey,bbsTimed} from '../src/timed-criteria.js';
import {workflowProgress,stampCompletion,completionDate} from '../src/assessment-workflow.js';
const progress=(key,f)=>workflowProgress(getAssessment(key),f,summarize(getAssessment(key),f.answers,f.fields));
test('SPPB checked criteria score without manufacturing actual seconds or walking speed',()=>{
 const f={'sppb-side-criterion':'passed','sppb-semi-criterion':'passed','sppb-tandem-criterion':'passed','sppb-gait-1-criterion':'passed','sppb-chair-time-criterion':'passed','sppb-chair-single':'팔 사용 없이 가능'};
 const before=structuredClone(f),scores=scoreSPPB(f);assert.deepEqual(Object.values(scores).map(x=>x.score),[4,4,4]);assert.equal(scores['sppb-gait'].best,undefined);assert.doesNotMatch(scores['sppb-gait'].reason,/m\/s/);assert.deepEqual(f,before);
 for(const id of ['sppb-side','sppb-semi','sppb-tandem','sppb-gait-1','sppb-chair-time'])assert.equal(f[id],undefined);
});
test('failed timing criteria need actual seconds; strict upper and inclusive lower boundaries remain exact',()=>{
 for(const [id,mode,raw,valid] of [['sppb-side','below','',false],['sppb-side','below','9.99',true],['sppb-side','below','10',false],['sppb-side','passed','9.99',false],['sppb-side','passed','11',false],['sppb-gait-1','passed','4.82',false],['sppb-gait-1','passed','4.81',true],['sppb-gait-1','passed','0',false],['sppb-chair-time','passed','0',false],['sppb-chair-time','passed','11.19',true],['ols-open-right','passed','29.99',false],['ols-open-right','below','29.99',true]])assert.equal(criterionState(id,{[modeKey(id)]:mode,[id]:raw}).valid,valid,`${id} ${mode} ${raw}`);
 const r=scoreSPPB({'sppb-side':'10','sppb-semi':'10','sppb-tandem-criterion':'below'});assert.equal(r['sppb-balance'].score,null);
});
test('completion needs actual BBS times below top criteria and includes both rotation directions',()=>{
 const a=getAssessment('bbs'),f={fields:{},answers:Object.fromEntries(a.items.map(x=>[x.id,4]))};assert.equal(progress('bbs',f).complete,true);
 f.answers['bbs-10']=3;assert.equal(progress('bbs',f).complete,false);f.fields['bbs-10-seconds-right']='4';assert.equal(progress('bbs',f).complete,false);f.fields['bbs-10-seconds-left']='8';assert.equal(progress('bbs',f).complete,true);
 f.answers['bbs-10']=4;assert.equal(progress('bbs',f).complete,false);f.fields['bbs-10-seconds-left']='0';assert.equal(progress('bbs',f).complete,false);
 assert.deepEqual(Object.keys(bbsTimed),['bbs-1','bbs-2','bbs-5','bbs-6','bbs-10','bbs-11','bbs-12','bbs-13']);
});
test('completion dates persist through edits, disappear on incomplete status, and renew after completing again',()=>{
 const form={};stampCompletion(form,true,'2026-10-23T15:01:00Z');assert.equal(completionDate(form.completedAt),'2026-10-24');stampCompletion(form,true,'2026-10-25T00:00:00Z');assert.equal(form.completedAt,'2026-10-23T15:01:00Z');stampCompletion(form,false);assert.equal(form.completedAt,undefined);stampCompletion(form,true,'2026-10-25T00:00:00Z');assert.equal(form.completedAt,'2026-10-25T00:00:00Z');
});
test('measurement-only completion has instrument-specific requirements; optional fields are not forced',()=>{
 const f={answers:{},fields:{'tug-distance':'3','tug-original':'12','tug-pace':'평소 속도','tug-assistance':'신체적 도움 없음','tug-population':'뇌졸중'}};assert.equal(progress('tug',f).complete,true);f.fields['tug-cognitive']='15';assert.equal(progress('tug',f).complete,false);f.fields['tug-cognitive-protocol']='기타 인지 과제';assert.equal(progress('tug',f).complete,true);
 const grip={answers:{},fields:{'grip-sex':'남성','grip-dominant':'오른손',...Object.fromEntries(['right','left'].flatMap(side=>[1,2,3].map(n=>[`grip-${side}-${n}`,'20'])))}};assert.equal(progress('grip',grip).complete,true);grip.fields['grip-left-3']='skipped';assert.equal(progress('grip',grip).complete,false);
 const ols={answers:{},fields:Object.fromEntries(getAssessment('one-leg').fields.map(x=>[modeKey(x.id),'passed']))};assert.equal(progress('one-leg',ols).complete,true);
});

test('automatic charting retains criterion confirmations and does not invent measured time',async()=>{
 const {assessmentBasis}=await import('../src/charting/engine.js');
 const p={identity:{},visits:[{id:'visit',date:'2026-10-23',sequence:1,forms:{'one-leg':{answers:{},fields:{'ols-open-right-criterion':'passed'}}}}]};
 const basis=assessmentBasis(p,'visit');assert.equal(basis.length,1);assert.equal(basis[0].measures.length,1);assert.match(basis[0].measures[0].value,/통과 · 30초 이상/);assert.match(basis[0].measures[0].value,/실제 시간 미입력/);assert.equal(basis[0].complete,false);
});
