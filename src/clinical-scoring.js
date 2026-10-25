import {criterionState} from './timed-criteria.js';
// Rules transcribed from user-provided SPPB protocol and CDC STEADI / TUG documents.
// Numeric cutoffs apply only to the explicitly selected population and protocol.
export const scoringVersion='2026-10-25.review.v4';
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
export const tugPopulations=['지역사회 거주 일반 고령자','고관절 골절 수술 후 6개월','일측 경골하 절단 후 6개월','뇌졸중','파킨슨병','알츠하이머병','기타 / 복합질환'];
export const evidence=[
 {id:'sppb-protocol',title:'첨부 SPPB Protocol and Score Sheet, 9쪽',url:'',detail:'균형 0–4점, 3m/4m 빠른 보행 시간 0–4점, 팔 미사용 5회 의자 일어서기 0–4점. 연령별로 표준 배점을 바꾸지 않습니다.'},
 {id:'cdc-tug',title:'CDC STEADI, Timed Up & Go, 2017 (첨부 PDF)',url:'https://www.cdc.gov/steadi/hcp/clinical-resources/index.html',detail:'일반 고령자, 평소 속도 3m TUG: 12초 이상이면 추가 낙상 위험 평가 필요. 12초 미만도 낙상 위험을 배제하지 않습니다.'},
 {id:'shumway-2000',title:'Shumway-Cook et al. Physical Therapy. 2000;80(9):896–903 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Shumway-Cook+2000+timed+up+go+896',detail:'일반 TUG 13.5초, 신체 과제 14.5초, 인지 과제 15초의 연구 절단값. CDC 기준과 혼합하거나 다른 질환에 공통 적용하지 않습니다.'},
 {id:'hip-2007',title:'Kristensen et al. Physical Therapy. 2007;87(1):24–30 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Kristensen+2007+Timed+Up+Go+Hip+Fracture',detail:'고관절 골절 수술 후 6개월, 59명 표본의 24초 연구 참고값. 해당 시기·집단 선택에만 표시하며 일반화하지 않습니다.'},
 {id:'amputation-2007',title:'Dite et al. Arch Phys Med Rehabil. 2007;88(1):109–114 (첨부 DOC 인용)',url:'https://pubmed.ncbi.nlm.nih.gov/?term=Dite+2007+Clinical+identification+multiple+fall+risk+transtibial',detail:'일측 경골하 절단 후 6개월, 40명 표본의 19초 이상 다회 낙상 관련 연구 참고값. 일반 고령자 기준과 구분합니다.'}
];
export function interpretTUG(f={},context={}){
 const age=ageOn(context.birth,context.date),time=positive(f['tug-original']);
 const rows=[];
 if(age!==null)rows.push({label:'평가일 기준 연령',value:`만 ${age}세`});
 for(const [id,label] of [['tug-cognitive','인지 이중과제'],['tug-manual','신체 이중과제']]){const dual=positive(f[id]);if(time&&dual&&time<=3600&&dual<=3600)rows.push({label:`${label} 시간 증가율`,value:`${((dual-time)/time*100).toFixed(1)}% · (이중과제 시간 − 일반 시간) ÷ 일반 시간`});}
 if(!time||time>3600)return rows;
 if(Number(f['tug-distance']??3)!==3||f['tug-pace']!=='평소 속도'||f['tug-assistance']!=='신체적 도움 없음')return [...rows,{label:'TUG 해석',value:'3m · 평소 속도 · 신체적 도움 없음 조건을 확인하면 해당 기준을 비교합니다. 보행 보조기 사용은 별도로 기록하세요.'}];
 const population=f['tug-population'];
 if(population==='지역사회 거주 일반 고령자'&&age!==null&&age>=65){
  rows.push({label:'CDC STEADI · 12초 기준',value:time>=12?'12초 이상 · 낙상 위험 선별 기준 해당. 추가 낙상 평가가 필요합니다.':'12초 미만 · 이 기준에 해당하지 않음. 낙상 위험이 없다는 뜻은 아닙니다.'});
  if(f['tug-study-reference']==='연구 참고값도 표시'){
   for(const [id,cutoff,label] of [['tug-original',13.5,'일반'],['tug-manual',14.5,'신체 이중과제'],['tug-cognitive',15,'인지 이중과제']]){const n=positive(f[id]);const taskConfirmed=id==='tug-original'||id==='tug-manual'&&f['tug-manual-protocol']==='가득 찬 물컵 들기'||id==='tug-cognitive'&&f['tug-cognitive-protocol']==='20–100 임의 숫자에서 거꾸로 세기';if(n&&n<=3600&&taskConfirmed)rows.push({label:`Shumway-Cook 2000 · ${label}`,value:`${cutoff}초 연구 참고값 ${n>=cutoff?'이상':'미만'} · 소규모 연구이며 CDC 기준과 구분합니다.`});}
  }
 }else if(['고관절 골절 수술 후 6개월','일측 경골하 절단 후 6개월'].includes(population)){
  const hip=population.startsWith('고관절'),cutoff=hip?24:19;
  rows.push({label:hip?'고관절 골절 집단 · 연구 참고':'경골하 절단 집단 · 연구 참고',value:`${cutoff}초 참고값 ${time>=cutoff?'이상':'미만'} · ${hip?'59':'40'}명 연구의 해당 시기·집단에 한정. 낙상 위험 확정 결과가 아닙니다.`});
 }else rows.push({label:'집단별 해석',value:!population?'대상자 집단을 선택해 주세요.':population==='지역사회 거주 일반 고령자'?'만 65세 이상 고령자 조건이 확인되지 않아 CDC 선별 기준을 자동 적용하지 않습니다.':'선택한 질환에 검증된 절단값을 확인하지 못해 일반 고령자 기준을 적용하지 않습니다. 측정 시간과 경과를 확인하세요.'});
 return rows;
}
