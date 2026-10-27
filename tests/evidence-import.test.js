import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportCandidates} from '../src/report-import.js';
import {chairStandReference,muscleMassReference} from '../src/muscle-evidence.js';
import {interpretTUG} from '../src/clinical-scoring.js';
import {assessmentOrder,assessments,getAssessment,summarize} from '../src/data.js';
test('assessment order retains every assessment and includes the requested FAC',()=>{
 assert.equal(assessmentOrder.length,Object.keys(assessments).length);assert.equal(new Set(assessmentOrder).size,assessmentOrder.length);
 assert.deepEqual(assessmentOrder.slice(0,12),['basic','rom','mmt','tone','fac','bbs','mbi','sgds','sppb','tug','one-leg','sts']);
 const fac=getAssessment('fac');assert.deepEqual(fac.items[0].options.map(x=>x.score),[0,1,2,3,4,5]);assert.equal(summarize(fac,{'fac-category':0}).complete,true);assert.equal(summarize(fac,{'fac-category':'skipped'}).complete,false);
});
test('MoCA-K includes exactly six years in education adjustment, caps at 30 and does not borrow correction for K2',()=>{
 const a=getAssessment('moca-k');for(const years of ['0','5','6'])assert.equal(summarize(a,{}, {'moca-k-education':years}).adjustment,1);
 assert.equal(summarize(a,{}, {'moca-k-education':'7'}).adjustment,0);assert.equal(summarize(a,{}, {'moca-k-education':''}).educationKnown,false);
 const answers=Object.fromEntries(a.items.map(x=>[x.id,Math.max(...x.options.map(o=>o.score))]));assert.equal(summarize(a,answers,{'moca-k-education':'6'}).total,30);
 assert.equal(summarize(getAssessment('moca-k2'),{}, {'moca-k2-education':'6'}).adjustment,0);
});
test('result import excludes whole-body SMM, preserves ambiguity and requires explicit labelled segmental lean values',()=>{
 let values=reportCandidates('Height (cm): 170\nSkeletal Muscle Mass 30.2 kg\n골격근량 30.2 kg\nASM (kg): 20.4\nSMI (kg/m²) 7.06');
 assert.equal(values.find(x=>x.id==='asm-height').value,170);assert.equal(values.find(x=>x.id==='asm-mass').value,20.4);assert.equal(values.find(x=>x.id==='asm-index').value,7.06);
 assert.equal(reportCandidates('골격근량 30.2 kg\nSMM 30.2 kg').length,0);
 assert.equal(reportCandidates('ASM 20 kg\nASM 24 kg')[0].ambiguous,true);
 assert.equal(reportCandidates('오른팔 2.5 kg').length,0);
 values=reportCandidates('부위별 근육량\n오른팔 2.5 kg\n왼팔 2.4 kg\n오른다리 7.5 kg\n왼다리 7.3 kg\n몸통 22.2 kg\n부위별 체지방\n오른팔 1.1 kg');assert.deepEqual(values.map(x=>x.id),['right-arm','left-arm','right-leg','left-leg']);assert.equal(values[0].value,2.5);
});
test('5-STS Korean cohort references require 70–84 years and distinct five-repetition protocol',()=>{
 const f={'sts-five-time':'12.8','sts-five-population':'지역사회 거주 고령자','sts-five-arms':'팔 사용 없이 시행'},c={birth:'1950-01-01',date:'2026-10-27'};
 assert.match(chairStandReference(f,c)[0].value,/12.8초 기준 이상/);assert.match(chairStandReference({...f,'sts-five-time':'10.8'},c)[0].value,/10.8초 이상 · 12.8초 미만/);
 for(const context of [{birth:'1960-01-01',date:'2026-10-27'},{birth:'1940-01-01',date:'2026-10-27'}])assert.doesNotMatch(chairStandReference(f,context)[0].value,/12.8초 기준 이상/);
 assert.doesNotMatch(chairStandReference({...f,'sts-five-arms':'팔 사용 / 조건 다름'},c)[0].value,/12.8초 기준 이상/);
});
test('DXA comparisons respect guideline version, sex, exact inequality and measurement disagreement; no BIA diagnosis',()=>{
 const f={'asm-method':'DXA','asm-sex':'여성','asm-reference':'EWGSOP2 · DXA (2022 종설 본문)','asm-index':'5.5'};
 assert.match(muscleMassReference(f).at(-1).value,/기준 미해당/);assert.match(muscleMassReference({...f,'asm-index':'5.49'}).at(-1).value,/기준 해당/);
 assert.match(muscleMassReference({...f,'asm-reference':'AWGS 2014 · DXA (2022 종설 표1)','asm-index':'5.4'}).at(-1).value,/기준 해당/);
 assert.match(muscleMassReference({...f,'asm-method':'BIA'}).at(-1).value,/BIA 결과에 DXA 기준을 적용하지/);
 assert.match(muscleMassReference({...f,'asm-mass':'20','asm-height':'170'}).at(-1).value,/확인해야 비교/);
 assert.match(muscleMassReference({'asm-mass':'20','asm-height':'170'})[0].value,/6.92/);
 assert.equal(muscleMassReference({'asm-index':'skipped'})[0].value,'계산 전');
});
test('new TUG references do not generalize facility or NMD thresholds to community patients',()=>{
 const f={'tug-original':'12.5','tug-distance':'3','tug-pace':'평소 속도','tug-assistance':'신체적 도움 없음','tug-population':'시설 거주 고령자 (말레이시아 연구 참고)'},c={birth:'1950-01-01',date:'2026-10-27'};
 assert.match(interpretTUG(f,c).at(-1).value,/12.5초 참고값 이상/);assert.match(interpretTUG(f,c).at(-1).value,/특이도 34.4%/);
 assert.doesNotMatch(interpretTUG({...f,'tug-population':'지역사회 거주 일반 고령자'},c).map(x=>x.value).join(''),/12.5초 참고값/);
 const nmd={...f,'tug-original':'8.92','tug-nmd-2':'9','tug-nmd-3':'9.5','tug-population':'신경과 진단 신경근육질환 (18–65세)','tug-pace':'가능한 빠르게','tug-nmd-confirm':'신경과 진단 · 보행 보조기/신체 도움 없이 · 3회 시행 · 시행 간 2분 휴식'};
 const result=interpretTUG(nmd,{birth:'1990-01-01',date:'2026-10-27'}).at(-1).value;assert.match(result,/1회 8.92초 \(이하\)/);assert.match(result,/2회 9.00초 \(초과\)/);assert.match(result,/自動|자동 위험 판정하지/);
 assert.doesNotMatch(interpretTUG(nmd,c).at(-1).value,/각 시행/);
});
