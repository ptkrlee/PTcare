import {criterionState} from './timed-criteria.js';
// Rules transcribed from user-provided SPPB protocol and CDC STEADI / TUG documents.
// Numeric cutoffs apply only to the explicitly selected population and protocol.
export const scoringVersion='2026-10-27.sarcopenia.v7';
const present=v=>v!==''&&v!==undefined&&v!==null;
const positive=v=>present(v)&&v!=='skipped'&&Number.isFinite(Number(v))&&Number(v)>0&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<0.000001?Number(v):null;
const hold=v=>present(v)&&v!=='skipped'&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=10&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<0.000001?Number(v):null;
const row=(score,reason,extra={})=>({score,reason,...extra});
export function scoreSPPB(f={}){
 const duration=id=>{const c=criterionState(id,f);return c.active?(c.valid?(c.actual??10):null):hold(f[id]);};
 const side=duration('sppb-side'),semi=duration('sppb-semi'),tandem=duration('sppb-tandem');
 const result={};
 if(f['sppb-balance-status']==='불가능')result['sppb-balance']=row(0,'도움 없이 자세 유지 불가로 기록함.');
 else if(f['sppb-balance-status']==='미실시'||f['sppb-balance-status']==='skipped')result['sppb-balance']=row(null,'미평가 · 다음에 하기',{skipped:true});
 else if(side===null)result['sppb-balance']=row(null,'양발 모아 서기 시간을 입력하세요.',{skipped:f['sppb-side']==='skipped'});
 else if(side<10)result['sppb-balance']=row(0,'양발 모아 서기 10초 미만: 균형 검사를 종료합니다.');
 else if(semi===null)result['sppb-balance']=row(null,'반일렬 자세 시간을 입력하세요.',{skipped:f['sppb-semi']==='skipped'});
 else if(semi<10)result['sppb-balance']=row(1,'양발 모아 서기 1점 + 반일렬 자세 0점.');
 else if(tandem===null)result['sppb-balance']=row(null,'일렬 자세 시간을 입력하세요.',{skipped:f['sppb-tandem']==='skipped'});
 else result['sppb-balance']=row(2+(tandem>=10?2:tandem>=3?1:0),'양발 모아 서기 1점 + 반일렬 1점 + 일렬 자세 '+(tandem>=10?'2':tandem>=3?'1':'0')+'점.');
 // Later balance stages are not standard-valid after a failed earlier stage.
 if((side!==null&&side<10&&(semi!==null||tandem!==null))||(semi!==null&&semi<10&&tandem!==null))result['sppb-balance']=row(null,'앞 자세에서 10초 미만이면 다음 자세를 시행하지 않습니다. 실제 시행 순서와 시간을 확인하세요.');
 const distance=present(f['sppb-distance'])?Number(f['sppb-distance']):4;
 const times=['sppb-gait-1','sppb-gait-2'].map(id=>positive(f[id])).filter(v=>v!==null&&v<=3600);
 if(f['sppb-gait-status']==='불가능')result['sppb-gait']=row(0,'보행 수행 불가로 기록함.');
 else if(f['sppb-gait-status']==='미실시'||f['sppb-gait-status']==='skipped')result['sppb-gait']=row(null,'미평가 · 다음에 하기',{skipped:true});
 else if(![3,4].includes(distance))result['sppb-gait']=row(null,'보행 거리는 3m 또는 4m를 선택하세요.');
 else if(['sppb-gait-1','sppb-gait-2'].some(id=>criterionState(id,f).active&&!criterionState(id,f).valid))result['sppb-gait']=row(null,'선택한 시간 기준과 실제 보행 시간을 확인하세요.');
 else if(['sppb-gait-1','sppb-gait-2'].some(id=>{const c=criterionState(id,f);return c.valid&&c.confirmed&&c.actual===undefined;}))result['sppb-gait']=row(4,`${distance}m 최상위 시간 기준 충족 확인 · 실제 시간 미입력 시 보행 속도는 계산하지 않습니다.`);
 else if(!times.length)result['sppb-gait']=row(null,'보행 시간을 입력하세요. 0초는 유효한 시간이 아닙니다.',{skipped:['sppb-gait-1','sppb-gait-2'].some(id=>f[id]==='skipped')});
 else{
  const best=Math.min(...times),score=distance===4?(best>8.70?1:best>=6.21?2:best>=4.82?3:4):(best>6.52?1:best>=4.66?2:best>=3.62?3:4);
  result['sppb-gait']=row(score,`${distance}m · ${times.length===2?'두 시행 중 빠른':'1회 측정'} 시간 ${best.toFixed(2)}초 · ${(distance/best).toFixed(2)} m/s`,{best,distance});
 }
 const chair=positive(f['sppb-chair-time']);
 if(f['sppb-chair-status']==='불가능'||f['sppb-chair-single']==='팔 사용 / 수행 불가')result['sppb-chair']=row(0,'5회 수행 불가 또는 팔을 사용하여 수행함.');
 else if(['미실시','skipped'].includes(f['sppb-chair-status'])||['미실시','skipped'].includes(f['sppb-chair-single']))result['sppb-chair']=row(null,'미평가 · 다음에 하기',{skipped:true});
 else if(criterionState('sppb-chair-time',f).active&&!criterionState('sppb-chair-time',f).valid)result['sppb-chair']=row(null,'선택한 시간 기준과 실제 의자 일어서기 시간을 확인하세요.');
 else if(criterionState('sppb-chair-time',f).confirmed&&f['sppb-chair-single']==='팔 사용 없이 가능')result['sppb-chair']=row(4,'팔 사용 없이 5회 · 11.19초 이하 기준 충족 확인 (실제 시간은 별도 기록).');
 else if(chair===null||chair>3600)result['sppb-chair']=row(null,'5회 일어서기 시간을 입력하세요. 0초는 유효한 시간이 아닙니다.',{skipped:f['sppb-chair-time']==='skipped'});
 else if(f['sppb-chair-single']!=='팔 사용 없이 가능')result['sppb-chair']=row(null,'팔을 사용하지 않고 일어섰는지 확인해 주세요.');
 else result['sppb-chair']=row(chair>60?0:chair>=16.70?1:chair>=13.70?2:chair>=11.20?3:4,chair>60?'60초 초과: 0점.':`팔 사용 없이 5회 · ${chair.toFixed(2)}초.`);
 for(const id of ['sppb-side','sppb-semi','sppb-tandem']){const c=criterionState(id,f);if(c.active&&!c.valid)result['sppb-balance']=row(null,c.reason);}
 if(['sppb-side','sppb-semi','sppb-tandem'].some(id=>criterionState(id,f).confirmed))result['sppb-balance'].reason+=' · 통과는 기준 충족 확인이며 실제 측정 초와 구분합니다.';
 return result;
}
export function ageOn(birth,date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth||'')||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
 const valid=v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;};
 if(!valid(birth)||!valid(date)||birth>date)return null;
 const age=Number(date.slice(0,4))-Number(birth.slice(0,4))-(date.slice(5)<birth.slice(5)?1:0);return age<=130?age:null;
}
export const tugPopulations=['지역사회 거주 일반 고령자','고관절 골절 수술 후 6개월','일측 경골하 절단 후 6개월','뇌졸중','파킨슨병','알츠하이머병','신경과 진단 신경근육질환 (18–65세)','시설 거주 고령자 (말레이시아 연구 참고)','기타 / 복합질환'];
export const evidence=[
 {id:'sppb-protocol',title:'첨부 SPPB Protocol and Score Sheet, 9쪽',url:'',detail:'균형 0–4점, 3m/4m 빠른 보행 시간 0–4점, 팔 미사용 5회 의자 일어서기 0–4점. 연령별로 표준 배점을 바꾸지 않습니다.'},
 {id:'cdc-tug',title:'CDC STEADI, Timed Up & Go, 2017 (첨부 PDF)',url:'https://www.cdc.gov/steadi/hcp/clinical-resources/index.html',detail:'일반 고령자, 평소 속도 3m TUG: 12초 이상이면 추가 낙상 위험 평가 필요. 12초 미만도 낙상 위험을 배제하지 않습니다.'},
 {id:'shumway-2000',title:'Shumway-Cook et al. Physical Therapy. 2000;80(9):896–903 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Shumway-Cook+2000+timed+up+go+896',detail:'일반 TUG 13.5초, 신체 과제 14.5초, 인지 과제 15초의 연구 절단값. CDC 기준과 혼합하거나 다른 질환에 공통 적용하지 않습니다.'},
 {id:'hip-2007',title:'Kristensen et al. Physical Therapy. 2007;87(1):24–30 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Kristensen+2007+Timed+Up+Go+Hip+Fracture',detail:'고관절 골절 수술 후 6개월, 59명 표본의 24초 연구 참고값. 해당 시기·집단 선택에만 표시하며 일반화하지 않습니다.'},
 {id:'amputation-2007',title:'Dite et al. Arch Phys Med Rehabil. 2007;88(1):109–114 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Dite+2007+Clinical+identification+multiple+fall+risk+transtibial',detail:'일측 경골하 절단 후 6개월, 40명 표본의 19초 이상 다회 낙상 관련 연구 참고값. 일반 고령자 기준과 구분합니다.'}
];
evidence.push(
 {id:'nmd-2022',keys:['tug'],title:'Savcun Demirci et al. Turk J Neurol. 2022;28:6–9 (첨부 원문)',url:'https://doi.org/10.4274/tnd.2021.84553',detail:'18–65세 신경근육질환 102명, 도움·보조기 없이 3m TUG 3회(2분 휴식), 가능한 빠르게. 표 절단값 8.92초, AUC 0.887, 민감도 80.9%, 특이도 72.7%. 초록은 8.9초로 반올림. 3회 대표값 산출법이 명시되지 않아 각 시행 비교만 제공.'},
 {id:'malaysia-2025',keys:['tug'],title:'Zohari et al. Malays J Med Sci. 2025;32(5):51–61',url:'https://doi.org/10.21315/mjms-05-2025-367',detail:'말레이시아 시설 거주, 60세 이상 독립 보행(보조기 허용) 92명. 3m TUG 12.5초, DFRI 기준 AUC 0.65, 민감도 93.5%, 특이도 34.4%. 한국 지역사회 고령자에게 그대로 적용하지 않음.'},
 {id:'awgs-editorial-2025',keys:['sarcopenia','grip','sts'],title:'Won & Jung. AWGS 2025 지침 소개 사설. Ann Geriatr Med Res. 2025;29:421–423',url:'https://doi.org/10.4235/agmr.25.0207',detail:'50–64세까지 관리 대상 확대를 소개하지만 수치 기준표·진단 알고리즘이 없는 사설입니다. 인용된 AWGS 2025 합의문 원문과 표가 필요합니다. 이 파일만으로 악력·ASM·5회 STS 절단값을 만들지 않습니다.'},
 {id:'imacs-mmt',keys:['mmt'],title:'IMACS Form 04 · Manual Muscle Testing Procedures (첨부 1–3쪽)',url:'',detail:'Kendall 변형 등급표의 0·T·2−·2·2+·3−·3·3+·4−·4·4+·5를 사용. 3− 서서히 내려오기 3초 이상, 3 검사 자세 3초 유지, 저항 적용 3초. 0–10 대응값을 MMT 0–5 등급과 혼합·합산하지 않음.'},
 {id:'kfacs-sts-2021',keys:['sts'],title:'Kim & Won. Cut Points of Chair Stand Test… JAMDA (사용자 제공 초록)',url:'https://doi.org/10.1016/j.jamda.2021.11.007',detail:'한국 KFACS 70–84세 지역사회 거주자, 기초 2,977명·2년 추적 2,515명. 5회 STS 10.8초·12.8초 경계값. 초록에 상세 시행법과 경계 포함 규칙이 없어 수치 비교만 제공하며 30초/1분 STS나 SPPB 배점으로 바꾸지 않음.'},
 {id:'lim-2025',keys:['sarcopenia','grip','sts','sppb','circumference','tug'],title:'임재영. 근감소증의 정의, 검사 방법 및 진단기준에 대한 고찰. J Korean Diabetes. 2025;26:80–89',url:'https://doi.org/10.4093/jkd.2025.26.2.80',detail:'82–86쪽·표1. AWGS 2019/KWGS 악력 남<28/여<18kg; DXA 남<7.0/여<5.4, BIA 남<7.0/여<5.7kg/m²; SPPB≤9, 5회 STS≥12초; KWGS TUG≥12초. EWGSOP2 악력 남<27/여<16kg, 5회STS≥15초, SPPB<9, TUG≥20초. 종아리 남<34/여<33cm, SARC-F≥4는 선별. 보행1.0m/s는 본문≤/표1< 불일치로 정확히1.00은 유보. 2025년에 출판된 AWGS 2019/KWGS 종설이며 AWGS2025 원문이 아님. 5회STS 종료 방식과 프로토콜을 구분하고 다른 날짜 자료를 자동 합치지 않음.'},
 {id:'tagliafico-2022',keys:['sarcopenia','grip','sts'],title:'Tagliafico et al. Sarcopenia: how to measure, when and why. Radiol Med. 2022;127:228–237 (첨부 원문)',url:'https://doi.org/10.1007/s11547-022-01450-3',detail:'근력 저하·근육량/질 저하·신체기능 저하를 구분. 232쪽 DXA 본문: 남성 ALMI <7.0, 여성 <5.5 kg/m²; 표1 AWGS 2014: 남성 ≤7.0, 여성 ≤5.4. 서로 다른 판본·비교연산자를 구분해 선택한 DXA 기준만 비교. BIA 수분 상태의 한계를 명시하며 최신 AWGS 2025 수치표는 아님.'},
 {id:'ph-sts-2024',keys:['sts'],title:'ERS Congress 2024, Eur Respir J 64 Suppl.68 PA2505 (사용자 첨부 초록 이미지)',url:'',detail:'폐고혈압 114명, 1분 STS 14.5회가 6MWT 165m 미만 식별: 민감도 69%, 특이도 100%. 학회 초록이며 전문 없음. 기존 30초 STS·5회 STS·일반 고령자 낙상 절단값으로 사용하지 않음.'}
);
export function interpretTUG(f={},context={}){
 const age=ageOn(context.birth,context.date),time=positive(f['tug-original']);
 const rows=[];
 if(age!==null)rows.push({label:'평가일 기준 연령',value:`만 ${age}세`});
 for(const [id,label] of [['tug-cognitive','인지 이중과제'],['tug-manual','신체 이중과제']]){const dual=positive(f[id]);if(time&&dual&&time<=3600&&dual<=3600)rows.push({label:`${label} 시간 증가율`,value:`${((dual-time)/time*100).toFixed(1)}% · (이중과제 시간 − 일반 시간) ÷ 일반 시간`});}
 if(!time||time>3600)return rows;
 const population=f['tug-population'];
 if(population==='신경과 진단 신경근육질환 (18–65세)'){
  const times=[time,positive(f['tug-nmd-2']),positive(f['tug-nmd-3'])];
  const eligible=age!==null&&age>=18&&age<=65&&Number(f['tug-distance']??3)===3&&f['tug-pace']==='가능한 빠르게'&&f['tug-assistance']==='신체적 도움 없음'&&f['tug-nmd-confirm']==='신경과 진단 · 보행 보조기/신체 도움 없이 · 3회 시행 · 시행 간 2분 휴식'&&times.every(t=>t!==null&&t<=3600);
  rows.push({label:'신경근육질환 · 8.92초 연구 참고',value:eligible?`각 시행 ${times.map((t,i)=>`${i+1}회 ${t.toFixed(2)}초 (${t>8.92?'초과':'이하'})`).join(' · ')}. 102명 후향 연구, 민감도 80.9%, 특이도 72.7%. 원문 표 8.92초(초록 8.9초). 원문에 3회 대표값 산출법이 명확하지 않아 평균·최고값으로 자동 위험 판정하지 않습니다.`:'18–65세, 신경과 진단, 3m, 가능한 빠르게, 보조기·신체 도움 없이 3회(사이 2분 휴식) 조건을 확인하세요. 원문의 8.92초는 해당 연구 집단의 참고값입니다.'});return rows;
 }
 if(Number(f['tug-distance']??3)!==3||f['tug-pace']!=='평소 속도'||f['tug-assistance']!=='신체적 도움 없음')return [...rows,{label:'TUG 해석',value:'3m · 평소 속도 · 신체적 도움 없음 조건을 확인하면 해당 기준을 비교합니다. 보행 보조기 사용은 별도로 기록하세요.'}];
 if(population==='지역사회 거주 일반 고령자'&&age!==null&&age>=65){
  rows.push({label:'CDC STEADI · 12초 기준',value:time>=12?'12초 이상 · 낙상 위험 선별 기준 해당. 추가 낙상 평가가 필요합니다.':'12초 미만 · 이 기준에 해당하지 않음. 낙상 위험이 없다는 뜻은 아닙니다.'});
  if(f['tug-study-reference']==='연구 참고값도 표시'){
   for(const [id,cutoff,label] of [['tug-original',13.5,'일반'],['tug-manual',14.5,'신체 이중과제'],['tug-cognitive',15,'인지 이중과제']]){const n=positive(f[id]);const taskConfirmed=id==='tug-original'||id==='tug-manual'&&f['tug-manual-protocol']==='가득 찬 물컵 들기'||id==='tug-cognitive'&&f['tug-cognitive-protocol']==='20–100 임의 숫자에서 거꾸로 세기';if(n&&n<=3600&&taskConfirmed)rows.push({label:`Shumway-Cook 2000 · ${label}`,value:`${cutoff}초 연구 참고값 ${n>=cutoff?'이상':'미만'} · 소규모 연구이며 CDC 기준과 구분합니다.`});}
  }
 }else if(population==='시설 거주 고령자 (말레이시아 연구 참고)'&&age!==null&&age>=60){
  rows.push({label:'시설 거주 고령자 · 12.5초 연구 참고',value:`12.5초 참고값 ${time>=12.5?'이상':'미만'} · 말레이시아 단일 시설 92명, DFRI 기준 AUC 0.65, 민감도 93.5%, 특이도 34.4%. 한국 재가 대상자에 검증된 판정값이 아니며 낙상 위험을 확정·배제하지 않습니다.`});
 }else if(['고관절 골절 수술 후 6개월','일측 경골하 절단 후 6개월'].includes(population)){
  const hip=population.startsWith('고관절'),cutoff=hip?24:19;
  rows.push({label:hip?'고관절 골절 집단 · 연구 참고':'경골하 절단 집단 · 연구 참고',value:`${cutoff}초 참고값 ${time>=cutoff?'이상':'미만'} · ${hip?'59':'40'}명 연구의 해당 시기·집단에 한정. 낙상 위험 확정 결과가 아닙니다.`});
 }else rows.push({label:'집단별 해석',value:!population?'대상자 집단을 선택해 주세요.':population==='지역사회 거주 일반 고령자'?'만 65세 이상 고령자 조건이 확인되지 않아 CDC 선별 기준을 자동 적용하지 않습니다.':'선택한 질환에 검증된 절단값을 확인하지 못해 일반 고령자 기준을 적용하지 않습니다. 측정 시간과 경과를 확인하세요.'});
 return rows;
}
