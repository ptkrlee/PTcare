import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreSPPB,ageOn,interpretTUG} from '../src/clinical-scoring.js';
import {assessments,summarize} from '../src/data.js';
const gait=(time,distance=4)=>scoreSPPB({'sppb-gait-1':String(time),'sppb-distance':String(distance)})['sppb-gait'].score;
const chair=time=>scoreSPPB({'sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':String(time)})['sppb-chair'].score;
test('SPPB uses all exact 3m/4m and chair thresholds in the attached scoring protocol',()=>{
 for(const [time,expected] of [[4.81,4],[4.82,3],[6.20,3],[6.21,2],[8.70,2],[8.71,1]])assert.equal(gait(time),expected,`${time}s 4m`);
 for(const [time,expected] of [[3.61,4],[3.62,3],[4.65,3],[4.66,2],[6.52,2],[6.53,1]])assert.equal(gait(time,3),expected,`${time}s 3m`);
 for(const [time,expected] of [[11.19,4],[11.20,3],[13.69,3],[13.70,2],[16.69,2],[16.70,1],[60,1],[60.01,0]])assert.equal(chair(time),expected,`${time}s chair`);
 assert.equal(gait(6.205),null);assert.equal(gait(0),null);assert.equal(gait(-1),null);assert.equal(chair(0),null);
});
test('SPPB balance follows the required progression, distinguishing deferred from failed tests',()=>{
 const balance=f=>scoreSPPB(f)['sppb-balance'];
 assert.equal(balance({'sppb-side':'9.99'}).score,0);assert.equal(balance({'sppb-side':'10','sppb-semi':'9.99'}).score,1);
 for(const [time,expected] of [[0,2],[2.99,2],[3,3],[9.99,3],[10,4]])assert.equal(balance({'sppb-side':'10','sppb-semi':'10','sppb-tandem':String(time)}).score,expected);
 assert.equal(balance({}).score,null);assert.equal(balance({'sppb-side':'skipped'}).skipped,true);
 assert.equal(balance({'sppb-side':'9','sppb-semi':'10'}).score,null);assert.equal(balance({'sppb-side':'11'}).score,null);
 assert.equal(balance({'sppb-balance-status':'불가능'}).score,0);assert.equal(balance({'sppb-balance-status':'미실시'}).score,null);
});
test('SPPB picks the faster valid trial and requires no-arm chair confirmation',()=>{
 const r=scoreSPPB({'sppb-gait-1':'9','sppb-gait-2':'4','sppb-chair-time':'10'});assert.equal(r['sppb-gait'].score,4);assert.equal(r['sppb-gait'].best,4);assert.equal(r['sppb-chair'].score,null);
 assert.equal(scoreSPPB({'sppb-gait-status':'미실시','sppb-gait-1':'4'})['sppb-gait'].score,null);
 assert.equal(scoreSPPB({'sppb-chair-single':'팔 사용 / 수행 불가','sppb-chair-time':'10'})['sppb-chair'].score,0);
 assert.equal(scoreSPPB({'sppb-gait-status':'불가능'})['sppb-gait'].score,0);
 const s=summarize(assessments.sppb,{}, {'sppb-side':'10','sppb-semi':'10','sppb-tandem':'10','sppb-gait-1':'4','sppb-chair-single':'팔 사용 없이 가능','sppb-chair-time':'10'});assert.equal(s.total,12);assert.equal(s.complete,true);
});
test('MoCA raw counts derive fluency, serial-seven and vigilance points without mutating manual answers',()=>{
 for(const key of ['moca-k','moca-k2']){const a=assessments[key],limit=key==='moca-k'?11:6,manual={[key+'-fluency']:1};
  for(const [count,expected] of [[limit-1,0],[limit,1]])assert.equal(summarize(a,manual,{[key+'-fluency-count']:String(count)}).answers[key+'-fluency'],expected);
  for(const [count,expected] of [[0,0],[1,1],[2,2],[3,2],[4,3],[5,3]])assert.equal(summarize(a,{}, {[key+'-serial7-correct']:String(count)}).answers[key+'-serial7'],expected);
  for(const [count,expected] of [[0,1],[1,1],[2,0]])assert.equal(summarize(a,{}, {[key+'-vigilance-errors']:String(count)}).answers[key+'-vigilance'],expected);
  assert.equal(summarize(a,manual,{[key+'-fluency-count']:'-1'}).answers[key+'-fluency'],undefined);assert.equal(summarize(a,manual,{[key+'-fluency-count']:'skipped'}).answers[key+'-fluency'],'skipped');assert.equal(manual[key+'-fluency'],1);
 }
});
const standard={'tug-distance':'3','tug-pace':'평소 속도','tug-assistance':'신체적 도움 없음','tug-population':'지역사회 거주 일반 고령자'};
const context={birth:'1950-10-23',date:'2026-10-22'};
const text=rows=>rows.map(row=>row.label+' '+row.value).join('\n');
test('TUG computes age on assessment date and applies CDC only to eligible standard-condition tests',()=>{
 assert.equal(ageOn(context.birth,context.date),75);assert.equal(ageOn('1950-10-22',context.date),76);assert.equal(ageOn('2026-02-30',context.date),null);assert.equal(ageOn('2027-01-01',context.date),null);
 assert.match(text(interpretTUG({...standard,'tug-original':'12'},context)),/12초 이상/);assert.match(text(interpretTUG({...standard,'tug-original':'11.99'},context)),/12초 미만/);
 for(const override of [{'tug-distance':'4'},{'tug-pace':'가능한 빠르게'},{'tug-assistance':'신체적 도움 있음'}])assert.doesNotMatch(text(interpretTUG({...standard,...override,'tug-original':'15'},context)),/선별 기준 해당/);
 assert.doesNotMatch(text(interpretTUG({...standard,'tug-original':'15'},{birth:'2000-01-01',date:context.date})),/선별 기준 해당/);
 assert.doesNotMatch(text(interpretTUG({...standard,'tug-original':'15','tug-population':'뇌졸중'},context)),/선별 기준 해당/);
 assert.doesNotMatch(text(interpretTUG({...standard,'tug-original':'0'},context)),/12초/);
});
test('TUG keeps disease-specific and dual-task study values separate from CDC; no disease cutoff is invented',()=>{
 const f={...standard,'tug-original':'10','tug-cognitive':'15','tug-cognitive-protocol':'20–100 임의 숫자에서 거꾸로 세기','tug-study-reference':'연구 참고값도 표시'};const rows=interpretTUG(f,context);assert.match(text(rows),/50.0%/);assert.match(text(rows),/15초 연구 참고값 이상/);assert.equal(rows.filter(row=>row.label.startsWith('CDC')).length,1);assert.doesNotMatch(text(interpretTUG({...f,'tug-cognitive-protocol':'기타 인지 과제'},context)),/15초 연구 참고값/);
 assert.match(text(interpretTUG({...standard,'tug-original':'24','tug-population':'고관절 골절 수술 후 6개월'},context)),/24초 참고값 이상/);
 assert.match(text(interpretTUG({...standard,'tug-original':'19','tug-population':'일측 경골하 절단 후 6개월'},context)),/19초 참고값 이상/);
 assert.doesNotMatch(text(interpretTUG({...standard,'tug-original':'19','tug-population':'파킨슨병'},context)),/19초 참고값|12초 선별/);
});
