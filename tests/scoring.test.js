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
  assert.equal(summarize(a,zero).complete,true);
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

test('skipped is explicit and different from zero, with partial result totals',()=>{
 const a=assessments.bbs,answers=Object.fromEntries(a.items.map(item=>[item.id,0]));answers['bbs-0']='skipped';const s=summarize(a,answers);
 assert.equal(s.total,0);assert.equal(s.skipped,1);assert.equal(s.answered,13);assert.equal(s.complete,false);assert.equal(s.reviewed,true);
});
