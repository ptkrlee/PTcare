import {scoreSPPB} from './clinical-scoring.js';
export const sarcopeniaGuidelines=['AWGS 2019 · 임재영 2025','KWGS · 임재영 2025','EWGSOP2 · 첨부 종설'];
const num=(v,max=3600,min=0,step=.01)=>(typeof v==='string'||typeof v==='number')&&String(v).trim()!==''&&v!=='skipped'&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max&&Math.abs(Number(v)/step-Math.round(Number(v)/step))<.000001?Number(v):null;
const knownOr=values=>values.some(v=>v===true)?true:values.some(v=>v===false)?false:null;
const state=v=>v===null?'미확인':v?'기준 해당':'기준 미해당';
export function gripDomain(fields={},sex=fields['grip-sex'],european=false){
 const right=[1,2,3].map(n=>num(fields[`grip-right-${n}`],200)).filter(n=>n!==null),left=[1,2,3].map(n=>num(fields[`grip-left-${n}`],200)).filter(n=>n!==null);
 const valid=right.length>=2&&left.length>=2&&['남성','여성'].includes(sex)&&fields['grip-protocol']==='보정된 악력계 · 좌우 각 2–3회 최대 힘으로 측정 확인';
 const best=valid?Math.max(...right,...left):null,cut=sex==='남성'?(european?27:28):(european?16:18);
 return {low:best===null?null:best<cut,best,text:valid?`좌우 전체 최고 ${best} kg · ${sex} <${cut} kg: ${state(best<cut)}`:'성별과 보정된 악력계·좌우 각 2회 이상 시행을 확인하세요.'};
}
export function fiveStandDomain(fields={},european=false){
 const time=num(fields['sts-five-time'],3600,.01),valid=time!==null&&fields['sts-five-arms']==='팔 사용 없이 시행'&&['5회째 선 순간 (stand-stop)','5회째 앉은 순간 (sit-stop)'].includes(fields['sts-five-endpoint'])&&fields['sts-five-match']==='종료 방식과 적용 기준의 일치 확인';
 const cut=european?15:12;
 return {low:valid?time>=cut:null,text:valid?`${time}초 · ≥${cut}초: ${state(time>=cut)} · ${fields['sts-five-endpoint']}`:'5회 실제 시간·팔 미사용·종료 방식·적용 기준 일치를 확인하세요.'};
}
export function sarcopeniaAssessment(fields={},context={}){
 const guideline=fields['asm-guideline'];if(!sarcopeniaGuidelines.includes(guideline))return null;
 const european=guideline.startsWith('EWGSOP2'),korean=guideline.startsWith('KWGS'),sex=fields['asm-sex'],method=fields['asm-method'],visit=context.visit||{},forms=visit.forms||{};
 const domainFields=key=>forms[key]?.fields||{};
 const rows=[{label:'적용 기준',value:guideline+' · 임재영, J Korean Diabetes. 2025;26:80–89. doi:10.4093/jkd.2025.26.2.80 · 다른 회차 수치는 자동 혼합하지 않습니다.'}];
 const mass=num(fields['asm-mass'],100,.01),height=num(fields['asm-height'],250,.01),measured=num(fields['asm-index'],50,.01),calculated=mass!==null&&height!==null?mass/(height/100)**2:null;
 const discrepancy=measured!==null&&calculated!==null&&Math.abs(measured-calculated)>.15;
 let index=measured??calculated,lowMass=null,massText='측정 방법·성별·ASM 지수가 필요합니다.';
 const bmiMode=fields['asm-adjustment']==='BMI 보정 (ASM/BMI)',weight=num(fields['asm-weight'],500,.01),bmi=height&&weight?weight/(height/100)**2:null;
 if(bmiMode)index=num(fields['asm-bmi-index'],10,.001,.001)??(mass&&bmi?mass/bmi:null);
 if(fields['asm-adjustment']==='skipped')massText='근육량 보정 방식 미평가 · 기준 대조 보류.';
 else if(discrepancy&&!bmiMode)massText='장비 지수와 ASM/키² 계산값이 다릅니다. 원본을 대조하기 전 기준 대조를 보류합니다.';
 else if(['남성','여성'].includes(sex)&&index!==null&&['DXA','BIA'].includes(method)){
  if(bmiMode&&(!korean||method!=='DXA'))massText='표1의 ASM/BMI는 KWGS 선택·DXA에서 별도 대조합니다. AWGS 2019나 BIA 기준으로 혼합하지 않습니다.';
  else if(european&&method!=='DXA')massText='EWGSOP2의 이 도구에 확인된 근육량 수치는 DXA 종설 기준입니다. BIA에 DXA 절단값을 적용하지 않습니다.';
  else{const cut=bmiMode?(sex==='남성' ? .789 : .512):sex==='남성'?7:european?5.5:method==='BIA'?5.7:5.4;lowMass=index<cut;massText=`${method} · ${sex} · ${bmiMode?'ASM/BMI':'ASM/키²'} ${index.toFixed(bmiMode?3:2)}${bmiMode?'':' kg/m²'} · <${cut}: ${state(lowMass)}`;}
 }
 rows.push({label:'근육량 대조',value:massText+(fields['asm-report-date']&&fields['asm-report-date']!=='skipped'?' · 결과지 측정일 '+fields['asm-report-date']:'' )});
 const gripFields=domainFields('grip'),conflict=gripFields['grip-sex']&&['남성','여성'].includes(gripFields['grip-sex'])&&sex&&gripFields['grip-sex']!==sex;
 const grip=gripDomain(gripFields,sex,european);if(conflict){grip.low=null;grip.text='악력 기록의 성별과 현재 성별이 다릅니다. 확인 전 대조를 보류합니다.';}
 const chair=fiveStandDomain(domainFields('sts'),european),strength=european?knownOr([grip.low,chair.low]):grip.low;
 rows.push({label:'근력 대조 · 같은 회차',value:grip.text+(european?' / 5회 STS 대체: '+chair.text:'')});
 const performances=[];
 // No score is manufactured from a partially measured SPPB or a legacy manually assigned total.
 if(forms.sppb){const sppb=scoreSPPB(domainFields('sppb')),scores=Object.values(sppb).map(x=>x.score);if(scores.length===3&&scores.every(n=>Number.isInteger(n))){const total=scores.reduce((a,b)=>a+b,0),low=european?total<9:total<=9;performances.push({low,text:`SPPB ${total}/12점 · ${european?'<9':'≤9'}점: ${state(low)}`});}}
 if(!european&&chair.low!==null)performances.push(chair);
 // TUG is a KWGS performance item here; it does not replace AWGS's listed three performance tests.
 if(korean||european){const f=domainFields('tug'),time=num(f['tug-original'],3600,.01);if(time!==null&&Number(f['tug-distance']??3)===3&&f['tug-pace']==='평소 속도'&&f['tug-assistance']==='신체적 도움 없음'){const cut=european?20:12;performances.push({low:time>=cut,text:`TUG ${time}초 · ≥${cut}초: ${state(time>=cut)} (근감소증 신체기능 참고 · 낙상 진단 아님)`});}}
 const gaitDistance=fields['asm-gait-distance'],gaitTime=num(fields['asm-gait-time'],3600,.01),gait=gaitTime!==null&&['4m','6m'].includes(gaitDistance)?Number(gaitDistance.slice(0,-1))/gaitTime:null;
 if(gait!==null&&['정적 출발 (static start)','이동 출발 (moving start)'].includes(fields['asm-gait-start'])&&fields['asm-gait-protocol']==='평소 속도 · 출발 방식 기록 및 기준 일치 확인'&&(european?gaitDistance==='4m':gaitDistance==='6m')){
  const low=european?gait<=.8:gait===1?null:gait<1;
  performances.push({low,text:`${gaitDistance} 보행 ${gait.toFixed(2)} m/s · ${european?'≤0.8':'<1.0'} m/s: ${state(low)}${!european&&gait===1?' (종설 본문 ≤1.0 / 표1 <1.0 불일치로 정확히 1.00은 판정 보류)':''}`});
 }
 if(korean||european){const status=fields['asm-walk400-status'],seconds=num(fields['asm-walk400-seconds'],3600,.01);if(status==='시행했으나 완주 불가'||status==='완주'&&seconds!==null)performances.push({low:status==='시행했으나 완주 불가'||seconds>=360,text:status==='시행했으나 완주 불가'?'400m 검사 시행 후 완주 불가 · 기능 저하 기준 해당':`400m ${seconds}초 · ≥360초: ${state(seconds>=360)}`});}
 const performance=knownOr(performances.map(x=>x.low));
 rows.push({label:'신체기능 대조 · 같은 회차',value:performances.length?performances.map(x=>x.text).join(' / '):'유효한 같은 회차 SPPB·5회 STS 또는 선택한 기준의 보행/TUG 기록이 필요합니다.'});
 const calf=domainFields('circumference'),right=num(calf['body-calf-right'],100,.01),left=num(calf['body-calf-left'],100,.01),calfValid=!european&&['남성','여성'].includes(sex)&&right!==null&&left!==null&&calf['body-calf-protocol']==='선 자세 · 비탄력 줄자 · 가장 굵은 부위'&&calf['body-calf-caution']==='뚜렷한 비대칭·신경성 근위축 우려 없음 확인',calfCut=sex==='남성'?34:33;
 const calfState=calfValid?(right<calfCut&&left<calfCut?true:right>=calfCut&&left>=calfCut?false:null):null;
 const sarcf=num(fields['asm-sarcf'],10),sarcfValid=sarcf!==null&&Number.isInteger(sarcf),screen=knownOr([calfState,sarcfValid?sarcf>=4:null,fields['asm-clinical-suspicion']==='임상적 의심 있음'?true:null]);
 rows.push({label:'선별 · 사례 발견',value:(sarcfValid?`별도 시행 SARC-F ${sarcf}/10 · ≥4: ${state(sarcf>=4)}. `:'')+(calfValid?`종아리 우 ${right} / 좌 ${left} cm · <${calfCut} cm: ${state(calfState)}. `:'종아리 선별은 자세·비대칭·신경성 근위축 우려 확인이 필요합니다. ')+'음성 선별만으로 근감소증을 배제하지 않습니다.'});
 let conclusion='자료 부족 · 확인된 영역만 표시합니다.';
 const dateMismatch=!!fields['asm-report-date']&&!!visit.date&&fields['asm-report-date']!==visit.date;
 if(dateMismatch&&fields['asm-date-review']!=='다른 검사일과의 차이·현재 상태를 검토함')conclusion='근육량 측정일과 다른 검사 회차의 날짜가 다르거나 미확인입니다. 날짜 차이와 현재 상태를 검토하기 전 통합 범주 판정을 보류합니다.';
 else if(fields['asm-applicability']!=='노화 관련 평가 대상과 측정 조건 확인')conclusion='적용 대상·측정 조건 확인 전 · 기준 대조는 참고로만 표시합니다.';
 else if(lowMass===true&&strength===true&&performance===true)conclusion='세 영역 저하 기준 해당 · 선택한 알고리즘의 중증 범주에 해당할 수 있어 전문 평가·검토가 필요합니다.';
 else if(european&&strength===true&&lowMass===true)conclusion='근력·근육량 저하 기준 해당 · EWGSOP2 근감소증 범주 검토 필요'+(performance===null?' · 신체기능 미확인으로 중증도 미확정.':'.');
 else if(!european&&lowMass===true&&(strength===true||performance===true))conclusion='근육량 및 근력 또는 신체기능 저하 기준 해당 · 근감소증 범주 검토 필요'+(strength===null||performance===null?' · 누락 영역이 있어 중증도 미확정.':'.');
 else if(korean&&lowMass===false&&strength===true&&performance===true)conclusion='근육량 저하 없이 근력·기능 저하 · KWGS 기능적 근감소증 제안 범주 검토 필요 (국제 공통 확정 기준 아님).';
 else if(strength===true||!european&&performance===true)conclusion=(european?'EWGSOP2 probable':'가능 근감소증')+' 검토 필요 · 근육량·기능 등 추가 확인과 임상 판단이 필요합니다.';
 else if(lowMass===false&&strength===false&&performance===false)conclusion='입력·확인된 검사에서는 세 영역 저하 기준에 해당하지 않습니다. 임상적 의심이나 다른 원인을 배제하는 결과는 아닙니다.';
 else if(screen===true)conclusion='선별 기준 해당 또는 임상적 의심 · 근력·기능·근육량 추가 평가가 필요합니다.';
 else if(lowMass===true)conclusion='근육량 저하 기준 해당 · 이 수치만으로 근감소증을 판단하지 않습니다. 근력·신체기능을 확인하세요.';
 rows.push({label:'근감소증 통합 요약 · 치료사 검토용',value:conclusion+' 자동 확진 결과가 아닙니다.'});
 return {guideline,lowMass,strength,performance,screen,rows,conclusion};
}
