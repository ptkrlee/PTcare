import test from 'node:test';
import assert from 'node:assert/strict';
import {assessments,getAssessment,summarize} from '../src/data.js';

test('BBS, walking MBI and satisfaction match the source maxima and item counts',()=>{
  for(const [key,max,count] of [['bbs',56,14],['mbi',100,10],['satisfaction',50,10]]){
    const a=assessments[key];
    assert.equal(a.items.length,count);
    const answers=Object.fromEntries(a.items.map(item=>[item.id,Math.max(...item.options.map(o=>o.score))]));
    assert.deepEqual([summarize(a,answers).total,summarize(a,answers).complete],[max,true]);
  }
});
test('unanswered is distinct from a selected zero; invalid answers never count',()=>{
  const a=assessments.bbs;
  assert.equal(summarize(a,{}).answered,0);
  assert.equal(summarize(a,{[a.items[0].id]:0}).answered,1);
  assert.equal(summarize(a,{[a.items[0].id]:99}).answered,0);
  const zero=Object.fromEntries(a.items.map(item=>[item.id,0]));
  assert.equal(summarize(a,zero).complete,true); // Legacy completed scores are not made incomplete by new time requirements.
  assert.equal(summarize(a,zero).total,0);
});
test('MBI uses item weights, with wheelchair replacing walking rather than adding',()=>{
  const walking=getAssessment('mbi');
  assert.deepEqual(walking.items.map(item=>item.options[2].score),[3,3,5,5,5,5,5,5,8,8]);
  assert.equal(summarize(walking,Object.fromEntries(walking.items.map(item=>[item.id,item.options[2].score]))).total,52);
  const wheel=getAssessment('mbi','wheelchair');
  assert.equal(wheel.items.length,10);
  assert.equal(wheel.max,90);
  assert.equal(wheel.items[8].title,'의자차(휠체어)');
  assert.equal(summarize(wheel,Object.fromEntries(wheel.items.map(item=>[item.id,item.options.at(-1).score]))).total,90);
  assert.equal(getAssessment('mbi').max,100);
});
test('satisfaction minimum is ten and maximum is fifty, not zero-based',()=>{
  const a=assessments.satisfaction;
  assert.equal(summarize(a,Object.fromEntries(a.items.map(item=>[item.id,1]))).total,10);
});

test('both MoCA versions total 30; education adjustment is Korean-version specific and capped',()=>{
 for(const key of ['moca-k','moca-k2']){
  const a=assessments[key],answers=Object.fromEntries(a.items.map(item=>[item.id,Math.max(...item.options.map(o=>o.score))]));
  assert.equal(summarize(a,answers,{'moca-k-education':'6'}).total,30);
  const lost=Object.fromEntries(a.items.map(item=>[item.id,0]));
  assert.equal(summarize(a,lost,{'moca-k-education':'6'}).total,key==='moca-k'?1:0);
  assert.equal(summarize(a,lost,{'moca-k-education':'7'}).total,0);
  assert.equal(summarize(a,answers,{}).complete,key!=='moca-k');
  assert.equal(summarize(a,answers,{'moca-k-education':'skipped'}).complete,key!=='moca-k');
 }
 assert.deepEqual(assessments['moca-k'].words,['얼굴','비단','교회','진달래','빨강']);
 assert.deepEqual(assessments['moca-k2'].words,['얼굴','비단','학교','피리','노랑']);
});
test('explicit skipped items stay distinct from zero, never become a complete total',()=>{
 const a=assessments.bbs,answers=Object.fromEntries(a.items.map(item=>[item.id,0]));answers['bbs-0']='skipped';
 const s=summarize(a,answers);assert.equal(s.total,0);assert.equal(s.skipped,1);assert.equal(s.answered,13);assert.equal(s.complete,false);assert.equal(s.selected[0].skipped,true);assert.equal(s.selected[0].option,undefined);
});
test('SPPB derives its three domains from measurements; other timed tests do not get invented point totals',()=>{
 assert.equal(summarize(assessments.sppb,{}, {'sppb-side':'10','sppb-semi':'10','sppb-tandem':'10','sppb-gait-1':'4','sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':'10'}).total,12);
 assert.equal(summarize(assessments.sppb,{'sppb-balance':4,'sppb-gait':4,'sppb-chair':4}).answered,0);
 for(const key of ['grip','sts','one-leg','tug','circumference']){assert.equal(summarize(assessments[key],{}).total,null);assert.equal(summarize(assessments[key],{}).complete,false);}
});

test('measurement calculations reject skipped, negative and invalid values',async()=>{
 const {computedMeasurements}=await import('../src/extra-assessments.js');
 assert.equal(computedMeasurements('circumference',{'body-waist':'80','body-hip':'100'})[0].value,'0.800');
 assert.equal(computedMeasurements('circumference',{'body-waist':'-5','body-hip':'100'})[0].value,'계산 전');
 assert.equal(computedMeasurements('circumference',{'body-waist':'80','body-hip':'0'})[0].value,'계산 전');
 assert.equal(computedMeasurements('grip',{'grip-right-1':'skipped','grip-right-2':'21.5','grip-right-3':'23'})[0].value,'23 kg');
 assert.equal(computedMeasurements('sarcopenia',{'asm-walk-6m':'6'}).some(row=>row.label.includes('6m')),false);
});
