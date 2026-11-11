import test from 'node:test';
import assert from 'node:assert/strict';
import {secondsInputMax,expandedSecondsMax} from '../src/time-input.js';
import {extraAssessments,measurementValueValid} from '../src/extra-assessments.js';
import {criterionState,bbsTimeValid} from '../src/timed-criteria.js';
import {scoreSPPB,scoringVersion} from '../src/clinical-scoring.js';
import {getAssessment,summarize} from '../src/data.js';
import {workflowProgress} from '../src/assessment-workflow.js';
import {syncServicePlan,servicePlanInput} from '../src/service-plan.js';
test('recording limits expand independently of scoring thresholds and allow hundredth-second precision',()=>{
 for(const [threshold,max] of [[10,30],[30,60],[60,120]])assert.equal(expandedSecondsMax(threshold),max);
 for(const [key,id,max] of [['sppb','sppb-side',30],['sppb','sppb-semi',30],['sppb','sppb-tandem',30],['one-leg','ols-open-right',60],['one-leg','ols-closed-left',30],['sppb','sppb-chair-time',120]]){
  const field=extraAssessments[key].fields.find(f=>f.id===id);assert.equal(field.max,max);assert.equal(field.step,0.01);assert.equal(measurementValueValid(field,'0.00'),field.min===0);for(const value of ['0.01','6.28','12.34',max.toFixed(2)])assert.equal(measurementValueValid(field,value),true,`${id} ${value}`);assert.equal(measurementValueValid(field,String(max+0.01)),false);assert.equal(measurementValueValid(field,'6.281'),false);
 }
 assert.equal(secondsInputMax('bbs-5-seconds'),30);assert.equal(secondsInputMax('bbs-12-seconds'),60);assert.equal(secondsInputMax('bbs-6-seconds'),120);
});
test('criterion checks, raw scoring and completion accept 12.00 seconds for a ten-second hold without truncating the record',()=>{
 const fields={'sppb-side':'12.00','sppb-side-criterion':'passed','sppb-semi':'8.27','sppb-semi-criterion':'below','sppb-tandem':'6.28','sppb-tandem-criterion':'below','sppb-distance':'3','sppb-gait-1':'5.00','sppb-gait-2':'4.00','sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':'16.63'},before=JSON.stringify(fields),a=getAssessment('sppb');
 assert.equal(criterionState('sppb-side',fields).valid,true);assert.equal(criterionState('sppb-side',fields).actual,12);const scores=scoreSPPB(fields);assert.equal(scores['sppb-balance'].score,1);assert.match(scores['sppb-balance'].reason,/추가 관찰/);assert.equal(workflowProgress(a,{answers:{},fields},summarize(a,{},fields)).complete,true);assert.equal(summarize(a,{},fields).total,6);assert.equal(JSON.stringify(fields),before);
 for(const n of ['10.00','12.34','30.00'])assert.equal(scoreSPPB({'sppb-side':n,'sppb-semi':'10','sppb-tandem':'10'})['sppb-balance'].score,4);
 assert.equal(scoreSPPB({'sppb-side':'30.01'})['sppb-balance'].score,null);
});
test('one-leg and BBS holds accept expanded ceilings while scoring confirmations stay unchanged',()=>{
 for(const [id,value] of [['ols-open-right','60.00'],['ols-closed-right','30.00']])assert.equal(criterionState(id,{[id]:value,[id+'-criterion']:'passed'}).valid,true);
 const item=getAssessment('bbs').items.find(item=>item.id==='bbs-6');assert.equal(bbsTimeValid(item,{answers:{'bbs-6':4},fields:{'bbs-6-seconds':'120.00'}}),true);assert.equal(bbsTimeValid(item,{answers:{'bbs-6':4},fields:{'bbs-6-seconds':'120.01'}}),false);
 assert.equal(scoreSPPB({'sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':'120.00'})['sppb-chair'].score,0);assert.equal(scoreSPPB({'sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':'120.01'})['sppb-chair'].score,null);
});
test('service-plan cached calculations refresh for the scoring version without changing old review history',()=>{
 const p={identity:{},visits:[],servicePlan:{config:{},history:[{status:'reviewed',text:'이전 검토'}],current:{basisSignature:'older scoring rules'}}},before=JSON.stringify(p.servicePlan.history);assert.equal(JSON.parse(servicePlanInput(p)).scoringVersion,scoringVersion);assert.equal(syncServicePlan(p),true);assert.equal(JSON.stringify(p.servicePlan.history),before);assert.equal(syncServicePlan(p),false);
});
