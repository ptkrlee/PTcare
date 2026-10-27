import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sarcopeniaAssessment as assess,gripDomain,fiveStandDomain,sarcopeniaGuidelines} from '../src/sarcopenia-criteria.js';
const base={'asm-guideline':sarcopeniaGuidelines[0],'asm-sex':'여성','asm-method':'BIA','asm-index':'5.69','asm-applicability':'노화 관련 평가 대상과 측정 조건 확인'};
const grip=(n=17.9)=>({'grip-sex':'여성','grip-protocol':'보정된 악력계 · 좌우 각 2–3회 최대 힘으로 측정 확인','grip-right-1':String(n),'grip-right-2':String(n),'grip-left-1':'10','grip-left-2':'11'});
const sts=(time='12')=>({'sts-five-time':time,'sts-five-arms':'팔 사용 없이 시행','sts-five-endpoint':'5회째 선 순간 (stand-stop)','sts-five-match':'종료 방식과 적용 기준의 일치 확인'});
const context={visit:{forms:{grip:{fields:grip()},sts:{fields:sts()}}}};
test('Lim 2025 differentiates BIA/DXA and uses strict female/male mass and grip boundaries',()=>{
 assert.equal(assess(base,context).lowMass,true);assert.equal(assess({...base,'asm-index':'5.7'},context).lowMass,false);
 assert.equal(assess({...base,'asm-method':'DXA','asm-index':'5.4'},context).lowMass,false);assert.equal(assess({...base,'asm-method':'DXA','asm-index':'5.39'},context).lowMass,true);
 assert.equal(assess({...base,'asm-sex':'남성','asm-index':'7'},context).lowMass,false);assert.equal(assess({...base,'asm-sex':'남성','asm-index':'6.99'},context).lowMass,true);
 assert.equal(gripDomain(grip(18)).low,false);assert.equal(gripDomain(grip()).low,true);assert.equal(gripDomain(grip(16),'여성',true).low,false);
 assert.equal(gripDomain({...grip(),'grip-right-2':''}).low,null);assert.equal(gripDomain({...grip(),'grip-protocol':'조건 미확인 / 다름'}).low,null);
});
test('all three measured deficits yield a review category while missing/skipped values never become zero or normal',()=>{
 const complete=assess(base,context);assert.equal(complete.strength,true);assert.equal(complete.performance,true);assert.match(complete.conclusion,/중증 범주/);
 const missing=assess(base,{visit:{forms:{grip:{fields:grip()}}}});assert.equal(missing.performance,null);assert.match(missing.conclusion,/중증도 미확정/);
 const empty=assess({...base,'asm-index':'skipped'});assert.equal(empty.lowMass,null);assert.equal(empty.strength,null);assert.equal(empty.performance,null);assert.match(empty.conclusion,/자료 부족/);
 assert.doesNotMatch(assess({...base,'asm-applicability':''},context).conclusion,/중증 범주/);
 assert.equal(assess(base,{visit:{forms:{grip:{fields:{...grip(),'grip-sex':'남성'}}}}}).strength,null);
});
test('five STS endpoints and matching protocols are required; twelve and fifteen are inclusive per supplied review',()=>{
 assert.equal(fiveStandDomain(sts()).low,true);assert.equal(fiveStandDomain(sts('11.99')).low,false);
 assert.equal(fiveStandDomain(sts('15'),true).low,true);assert.equal(fiveStandDomain(sts('14.99'),true).low,false);
 assert.equal(fiveStandDomain({...sts(),'sts-five-endpoint':''}).low,null);assert.equal(fiveStandDomain({...sts(),'sts-five-match':''}).low,null);
 assert.equal(fiveStandDomain({...sts(),'sts-five-arms':'팔 사용 / 조건 다름'}).low,null);
});
test('KWGS functional category is distinct and does not leak its TUG item into AWGS 2019',()=>{
 const tug={fields:{'tug-original':'12','tug-distance':'3','tug-pace':'평소 속도','tug-assistance':'신체적 도움 없음'}},ctx={visit:{forms:{grip:{fields:grip()},tug}}};
 const f={...base,'asm-guideline':sarcopeniaGuidelines[1],'asm-index':'5.8'};
 assert.match(assess(f,ctx).conclusion,/기능적 근감소증 제안/);assert.equal(assess(base,ctx).performance,null);
 assert.equal(assess({...base,'asm-guideline':sarcopeniaGuidelines[2]},ctx).lowMass,null,'do not apply confirmed DXA threshold to European BIA');
});
test('gait one-meter boundary conflicts are deferred, 400m non-performance is not failure, BMI references stay separated',()=>{
 const gait={...base,'asm-gait-distance':'6m','asm-gait-time':'6','asm-gait-protocol':'평소 속도 · 출발 방식 기록 및 기준 일치 확인','asm-gait-start':'정적 출발 (static start)'};
 assert.equal(assess(gait).performance,null);assert.match(assess(gait).rows.map(x=>x.value).join(''),/불일치/);assert.equal(assess({...gait,'asm-gait-time':'6.01'}).performance,true);
 const kwgs={...base,'asm-guideline':sarcopeniaGuidelines[1]};assert.equal(assess({...kwgs,'asm-walk400-status':'미실시'}).performance,null);assert.equal(assess({...kwgs,'asm-walk400-status':'시행했으나 완주 불가'}).performance,true);assert.equal(assess({...kwgs,'asm-walk400-status':'완주','asm-walk400-seconds':'360'}).performance,true);
 const bmi={...kwgs,'asm-method':'DXA','asm-adjustment':'BMI 보정 (ASM/BMI)','asm-bmi-index':'0.512'};assert.equal(assess(bmi).lowMass,false);assert.equal(assess({...bmi,'asm-bmi-index':'0.511'}).lowMass,true);assert.equal(assess({...bmi,'asm-method':'BIA'}).lowMass,null);
});
test('sarcopenia screening is not diagnostic and mismatched calf sides defer interpretation',()=>{
 const calf={fields:{'body-calf-right':'32','body-calf-left':'32.9','body-calf-protocol':'선 자세 · 비탄력 줄자 · 가장 굵은 부위','body-calf-caution':'뚜렷한 비대칭·신경성 근위축 우려 없음 확인'}};
 assert.equal(assess(base,{visit:{forms:{circumference:calf}}}).screen,true);assert.equal(assess(base,{visit:{forms:{circumference:{fields:{...calf.fields,'body-calf-left':'33'}}}}}).screen,null);
 assert.equal(assess({...base,'asm-sarcf':'4'}).screen,true);assert.equal(assess({...base,'asm-sarcf':'0'}).screen,false);assert.doesNotMatch(assess({...base,'asm-sarcf':'0'}).conclusion,/三|정상/);
});
test('unsupported number precision and different source dates hold interpretation until reviewed',()=>{
 assert.equal(assess({...base,'asm-index':'5.699'},context).lowMass,null);
 const ctx={visit:{...context.visit,date:'2026-10-27'}};
 const different={...base,'asm-report-date':'2026-09-27'};assert.match(assess(different,ctx).conclusion,/통합 범주 판정을 보류/);assert.match(assess({...different,'asm-date-review':'다른 검사일과의 차이·현재 상태를 검토함'},ctx).conclusion,/중증 범주/);
 assert.equal(assess({...base,'asm-adjustment':'skipped'},context).lowMass,null);
});
