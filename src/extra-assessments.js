import {scoreSPPB,interpretTUG,tugPopulations} from './clinical-scoring.js';
const binary=(id,title,note,group)=>({id,title,note,group,options:[{label:'수행 / 정답',score:1},{label:'미수행 / 오답',score:0}]});
const score=(id,title,max,note)=>({id,title,note,options:Array.from({length:max+1},(_,i)=>({label:`${i}점`,score:i}))});
const number=(id,label,unit='초',max=3600)=>({id,label,type:'number',unit,min:0,max,step:0.01});
const text=(id,label)=>({id,label,type:'text'});
const status=(id,label)=>({id,label,type:'select',options:['가능','불가능','미실시']});
const makeMoCA=(key,k2)=>{
 const words=k2?['얼굴','비단','학교','피리','노랑']:['얼굴','비단','교회','진달래','빨강'];
 const id=x=>`${key}-${x}`;
 const items=[
  binary(id('trail'),'길 만들기','1–가–2–나–3–다–4–라–5–마 순서. 즉시 스스로 수정한 오류만 허용합니다.','시공간 / 집행기능'),
  binary(id('cube'),'정육면체 복사','3차원, 모든 선, 추가 선 없음, 평행과 비슷한 길이를 모두 확인합니다.','시공간 / 집행기능'),
  binary(id('clock-contour'),'시계 그리기 · 윤곽','11시 10분. 원형 윤곽의 기준을 확인합니다.','시공간 / 집행기능'),
  binary(id('clock-numbers'),'시계 그리기 · 숫자','모든 숫자가 순서와 위치에 맞아야 합니다.','시공간 / 집행기능'),
  binary(id('clock-hands'),'시계 그리기 · 바늘','11시 10분, 시침이 분침보다 짧고 중앙에서 만나야 합니다.','시공간 / 집행기능'),
  ...['사자',k2?'박쥐':'코뿔소','낙타'].map((animal,i)=>binary(id(`naming-${i}`),`이름대기 · ${animal}`,'첨부 검사지의 동물 그림을 보고 응답을 평가합니다.','이름대기')),
  binary(id('forward'),'숫자 바로 따라 외우기','2–1–8–5–4. 초당 숫자 하나씩 읽습니다.','주의력'),
  binary(id('backward'),'숫자 거꾸로 따라 외우기','7–4–2를 읽고, 2–4–7로 답하면 정답입니다.','주의력'),
  binary(id('vigilance'),k2?'주의집중 · 요일 “월”에 손뼉':'주의집중 · 글자 “가”에 책상 두드리기',k2?'검사지 요일열을 읽습니다. 월에만 손뼉을 치며 오류 0–1개는 1점, 2개 이상은 0점입니다.':'검사지 글자열을 읽습니다. 가에만 책상을 두드리며 오류 0–1개는 1점, 2개 이상은 0점입니다.','주의력'),
  {...score(id('serial7'),'100에서 7씩 빼기',3,'정답 0개=0점, 1개=1점, 2–3개=2점, 4–5개=3점. 각 뺄셈은 직전 응답에서 독립적으로 판정합니다. 예: 92,85,78,71,64는 3점.'),group:'주의력'},
  binary(id('sentence-1'),'문장 따라 말하기 1',k2?'“칼날같이 날카로운 바위.”':'“오늘 나를 도와줄 사람은 철수뿐이다.”','언어'),
  binary(id('sentence-2'),'문장 따라 말하기 2',k2?'“스물 일곱 개의 찬 맥주병이 냉장고에 있다.”':'“강아지가 방에 들어오면 고양이는 의자 밑에 숨는다.”','언어'),
  binary(id('fluency'),'단어 유창성',k2?'1분 동안 “ㄱ”으로 시작하는 단어 6개 이상이면 1점. 고유명사·숫자·접미사만 다른 낱말은 제외합니다.':'1분 동안 시장에서 살 수 있는 물건 11개 이상이면 1점.','언어'),
  binary(id('abstraction-1'),k2?'공통점 · 기차–비행기':'공통점 · 기차–자전거',k2?'교통수단·여행수단 등. “바퀴가 있다”는 정답이 아닙니다.':'첨부 실시요강의 운송수단 등 허용 답변 기준을 따릅니다.','추상력'),
  binary(id('abstraction-2'),k2?'공통점 · 시계–저울':'공통점 · 시계–자',k2?'측정도구 등. “숫자가 써 있다”는 정답이 아닙니다.':'첨부 실시요강의 측량도구 등 허용 답변 기준을 따릅니다.','추상력'),
  ...words.map((word,i)=>binary(id(`recall-${i}`),`지연회상 · ${word}`,'단서 없이 자발적으로 회상한 경우에만 1점. 범주·선다형 단서 후 회상은 0점입니다.','지연회상')),
  ...['년','월','일','요일','장소',k2?'도시 이름':'시·군'].map((value,i)=>binary(id(`orientation-${i}`),`지남력 · ${value}`,'검사 당일의 정확한 날짜·장소를 기준으로 평가합니다.','지남력')),
 ];
 const fields=[
  text(id('examiner'),'검사자'),
  {id:id('education'),label:'교육년수',type:'number',min:0,max:40,step:1,unit:'년',required:!k2},
  {id:id('memory-1-status'),label:'기억력 1차 시행 여부',type:'select',options:['실시함','미실시']},
  {id:id('memory-1'),label:'기억력 1차 시행 · 회상 단어',type:'checks',options:words},
  {id:id('memory-2-status'),label:'기억력 2차 시행 여부',type:'select',options:['실시함','미실시']},
  {id:id('memory-2'),label:'기억력 2차 시행 · 회상 단어',type:'checks',options:words},
  text(id('memory-note'),'기억력 시행 메모 (점수 없음)'),
  {id:id('fluency-count'),label:'유창성 단어 수',type:'number',min:0,max:300,step:1,unit:'개'},

  {id:id('serial7-correct'),label:'연속 빼기 정답 수 (입력 시 자동 채점)',type:'number',min:0,max:5,step:1,unit:'개'},
  {id:id('vigilance-errors'),label:'주의집중 오류 수 (입력 시 자동 채점)',type:'number',min:0,max:100,step:1,unit:'개'},
  {id:id('recall-status'),label:'지연회상 시행 여부',type:'select',options:['실시함','미실시']},
  ...words.map((word,i)=>({id:id(`cue-${i}`),label:`${word} · 회상 방법 (자동 채점)`,type:'select',options:['단서 없이 회상','범주 단서 후 회상','선다형 단서 후 회상','회상 못함','미실시']})),
  {id:id('recall-time'),label:'지연회상 실시 시각',type:'time'},
 ];
 return {code:k2?'K-MoCA':'MoCA-K',title:k2?'인지기능 평가 · K2 춘천판':'인지기능 평가 · MoCA-K',english:k2?'Korean-Montreal Cognitive Assessment · K2 Chuncheon':'Montreal Cognitive Assessment · Korean',short:k2?'MoCA · K2 춘천판':'MoCA · 한국판',max:30,unit:'30점 · 검사자 채점',items,fields,words,source:k2?'K-MoCA · June 6, 2012 / Version 7.1':'MoCA-K · 2006년 3월 1일',reference:k2?'moca-k2.png':'moca-k.png',instruction:'첨부 검사지와 실시요강에 따라 검사자가 시행하고 점수를 기록합니다. 즉각회상과 단서 후 회상은 총점에 포함하지 않습니다.',note:k2?'K2 춘천판은 첨부 실시요강에 교육년수 가산 규칙이 없어 원점수만 합산합니다. 다른 판의 보정이나 절단점을 적용하지 않습니다.':'한국판은 교육년수 6년 이하일 때 1점을 더하되 총점은 30점을 넘지 않습니다. 교육년수를 입력해야 보정 총점을 확정합니다.',sessionNote:'MoCA의 기억력·지연회상은 동일 검사 세션의 정해진 간격으로 실시합니다. 다음 방문에서 새로 검사할 때는 새 회차를 시작하세요. 여러 날에 걸친 기록은 표준 시행 총점으로 해석하지 않습니다.'};
};
export const extraAssessments={
 'moca-k':makeMoCA('moca-k',false),
 'moca-k2':makeMoCA('moca-k2',true),
 sppb:{code:'SPPB',title:'간이신체기능평가',english:'Short Physical Performance Battery',short:'SPPB',max:12,unit:'시간 입력 → 3영역 자동 채점 · 12점',sessionNote:'세 영역을 동일 검사 세션에서 정해진 순서로 시행합니다. 여러 날짜에 걸쳐 기록했다면 표준 시행 총점으로 해석하지 마세요.',items:[score('sppb-balance','균형 검사',4),score('sppb-gait','보행 속도 검사',4),score('sppb-chair','의자 일어서기 · 5회',4)],fields:[status('sppb-balance-status','균형 검사 수행'),number('sppb-side','양발 모아 서기 유지 (최대 10초)','초',10),number('sppb-semi','반일렬 자세 유지 (최대 10초)','초',10),number('sppb-tandem','일렬 자세 유지 (최대 10초)','초',10),{id:'sppb-distance',label:'보행 거리 (미선택 시 4m)',type:'select',options:['4','3'],unit:'m'},status('sppb-gait-status','보행 수행'),{...number('sppb-gait-1','보행 1차'),min:0.01},{...number('sppb-gait-2','보행 2차'),min:0.01},{id:'sppb-chair-single',label:'의자 일어서기 · 팔 사용 여부',type:'select',options:['팔 사용 없이 가능','팔 사용 / 수행 불가','미실시']},status('sppb-chair-status','의자 5회 일어서기 수행'),{...number('sppb-chair-time','의자 5회 일어서기'),min:0.01}],source:'첨부 SPPB-Score-Tool.pdf · Protocol and Score Sheet',instruction:'양발 모아 서기 → 반일렬 → 일렬 순서입니다. 앞 자세를 10초 유지하지 못하면 균형 검사를 종료하세요. 평소 속도로 3m 또는 4m 보행을 2회 측정해 빠른 시간을 사용하며, 1회만 시행하면 그 시간을 사용합니다. 의자 검사는 팔 사용 없이 5회 완전히 선 시점까지 측정합니다.',note:'초 단위 측정값으로 각 영역 0–4점과 총점 0–12점을 자동 계산합니다. 수행 불가는 0점, 미실시·미평가는 점수 미확정으로 구분합니다. 연령·질환에 따라 표준 배점 자체를 바꾸지 않습니다. 기존 수기점수는 원본에 보존되며 자동 총점은 측정값으로 다시 계산합니다.'},
 grip:{code:'GRIP',title:'악력 검사',english:'Hand Grip Strength',short:'악력',max:null,unit:'좌·우 측정값 · kg',items:[],fields:[{id:'grip-sex',label:'성별',type:'select',options:['남성','여성']},{id:'grip-dominant',label:'주사용 손',type:'select',options:['오른손','왼손','양손']},...['right','left'].flatMap(side=>[1,2,3].map(n=>number(`grip-${side}-${n}`,`${side==='right'?'오른손':'왼손'} ${n}차`,'kg',200)))],note:'악력계를 사용하여 측정합니다. 측정한 값 중 좌·우 최고값을 각각 표시하며, 첨부 자료에 없는 정상·위험 절단점을 적용하지 않습니다.'},
 sts:{code:'STS',title:'의자 일어서기 검사',english:'30-second Chair Stand, Five Times Sit-to-Stand & One Leg STS',short:'의자 일어서기',max:null,unit:'30초 반복 횟수 · 5회 소요 시간 · 한발 수행',items:[],fields:[{...number('sts-count','30초 동안 완전히 일어선 횟수','회',100),step:1},{id:'sts-arms',label:'상지 도움 사용',type:'select',options:['사용 안 함','사용함','미실시']},status('sts-single-right','오른발 한발 일어서기'),status('sts-single-left','왼발 한발 일어서기'),{...number('sts-five-time','의자 5회 일어서기 소요 시간'),min:0.01}],note:'첨부 그림: 약 17인치 높이의 등받이 있고 팔걸이 없는 의자에서 양팔을 가슴에 교차하여 30초 반복합니다. 상지를 사용하면 중단하고 횟수는 0회로 기록합니다. 종료 시 절반 이상 일어섰으면 1회로 셉니다. 한발 일어서기는 가능/불가능을 별도 기록합니다.'},
 'one-leg':{code:'OLS',title:'한발 서기 검사',english:'One Leg Standing',short:'한발 서기',max:null,unit:'눈 뜨기 · 눈 감기 · 초',items:[],fields:[number('ols-open-right','눈 뜨고 · 오른발 지지'),number('ols-open-left','눈 뜨고 · 왼발 지지'),number('ols-closed-right','눈 감고 · 오른발 지지'),number('ols-closed-left','눈 감고 · 왼발 지지')],note:'첨부 안내: 눈 뜨고 30초 이상, 눈 감고 10초 이상. 발을 무릎 높이까지 들되 무릎에 붙이지 않고, 손은 편한 자세로 둡니다. 통과는 첨부 안내의 유지 시간 목표 충족을 뜻하며 진단 기준이 아닙니다. 통과 시 실제 시간은 선택 입력, 기준 미만은 실제 시간을 입력합니다.'},
 tug:{code:'TUG',title:'일어나 걸어가기 검사',english:'Timed Up and Go',short:'TUG',max:null,unit:'소요 시간 · 조건별 선별 해석',items:[],fields:[number('tug-distance','편도 보행 거리','m',20),{id:'tug-pace',label:'보행 속도 지시',type:'select',options:['평소 속도','가능한 빠르게','기타']},{id:'tug-assistance',label:'검사 중 신체적 도움',type:'select',options:['신체적 도움 없음','신체적 도움 있음']},{id:'tug-population',label:'평가일 기준 대상자 집단 (치료사 확인)',type:'select',options:tugPopulations},{...number('tug-original','일반 과제 · 3m 왕복'),min:0.01},{...number('tug-cognitive','인지 이중과제'),min:0.01},text('tug-cognitive-task','인지 과제 내용 / 오류'),{id:'tug-cognitive-protocol',label:'인지 과제 연구 조건 확인',type:'select',options:['20–100 임의 숫자에서 거꾸로 세기','기타 인지 과제']},{...number('tug-manual','신체 이중과제'),min:0.01},{id:'tug-manual-protocol',label:'신체 과제 연구 조건 확인',type:'select',options:['가득 찬 물컵 들기','기타 신체 과제']},text('tug-aid','보조기 / 도움 / 특이사항'),{id:'tug-study-reference',label:'첨부 DOC의 연구 참고값',type:'select',options:['표시 안 함','연구 참고값도 표시']}],source:'첨부 CDC STEADI TUG (2017) 및 Timed-Up-and-Go.doc (2021 편집본)',instruction:'일반 신발·통상 보행 보조기 사용, 팔걸이 의자에서 시작해 평소 속도로 3m를 갔다 돌아와 다시 앉는 순간까지 시간을 잽니다. 신체적 도움은 제공하지 않으며 검사자는 안전을 위해 곁에 섭니다.',note:'TUG는 초 단위 검사로 별도 총점을 만들지 않습니다. 만 65세 이상 일반 고령자·표준 조건에서 CDC 12초 선별 기준을 표시합니다. 이중과제에 일반 TUG 절단값을 적용하지 않습니다. 질환별 문헌 참고값은 해당 집단에서만 표시하며, 최신 SCI/SCIE 문헌 검토가 완료되지 않아 첨부 자료에서 확인한 기준에 한정합니다.'},
 sarcopenia:{code:'ASM',title:'근육량 기록',english:'Muscle Mass',short:'근육량',max:null,unit:'근육량 · ASM 지수',items:[],fields:[{id:'asm-method',label:'근육량 측정 방법',type:'select',options:['DXA','BIA']},number('asm-mass','사지골격근량 (ASM)','kg',100),number('asm-height','키','cm',250),number('asm-index','장비에서 측정한 ASM 지수','kg/m²',50)],note:'근육량(DXA/BIA)과 ASM 지수를 기록합니다. 의자 5회 일어서기 시간은 STS 페이지에서 입력합니다. 이 도구에서 근감소증 진단을 자동 확정하지 않습니다.'},
 circumference:{code:'BODY',title:'허리·엉덩이·종아리 둘레',english:'Body Circumference Measurements',short:'신체 둘레',max:null,unit:'cm · 허리/엉덩이 비율',items:[],fields:[number('body-weight','체중','kg',500),number('body-height','키','cm',250),number('body-waist','허리 둘레','cm',300),number('body-hip','엉덩이 둘레','cm',300),number('body-calf-right','오른쪽 종아리 둘레','cm',100),number('body-calf-left','왼쪽 종아리 둘레','cm',100),...['right','left'].map(side=>({id:`body-finger-${side}`,label:`${side==='right'?'오른쪽':'왼쪽'} 종아리 핑거링 검사`,type:'select',options:['A · 종아리가 손가락 고리보다 굵음','B · 종아리와 고리가 딱 맞음','C · 종아리가 가늘어 고리가 헐렁함']}))],note:'허리 둘레 ÷ 엉덩이 둘레로 비율을 계산합니다. 엉덩이 둘레가 0 또는 미입력이면 계산하지 않습니다. 첨부 자료에 없는 진단 기준은 추가하지 않습니다.'},
};
export function measurementValueValid(field,value){
 if(value==null||value===''||value==='skipped')return false;
 if(field.type==='number'){const n=Number(value);return Number.isFinite(n)&&n>=field.min&&n<=field.max&&Math.abs(n/field.step-Math.round(n/field.step))<0.000001;}
 if(field.type==='select')return field.options.includes(value);
 if(field.type==='checks')return Array.isArray(value)&&value.every(v=>field.options.includes(v));
 return typeof value==='string';
}
export function computedMeasurements(key,fields={},context={}){
 const numeric=id=>{const field=extraAssessments[key]?.fields.find(f=>f.id===id);return field&&measurementValueValid(field,fields[id])?Number(fields[id]):null;};
 if(key==='sppb')return Object.entries(scoreSPPB(fields)).map(([id,result])=>({label:extraAssessments.sppb.items.find(item=>item.id===id).title,value:(result.score===null?'점수 미확정':result.score+' / 4점')+' · '+result.reason}));
 if(key==='tug')return interpretTUG(fields,context);
 if(key==='grip')return ['right','left'].map(side=>{const values=[1,2,3].map(n=>numeric(`grip-${side}-${n}`)).filter(v=>v!==null);return {label:`${side==='right'?'오른손':'왼손'} 최고 악력`,value:values.length?`${Math.max(...values)} kg`:'미측정'};});
 if(key==='circumference'){const w=numeric('body-waist'),h=numeric('body-hip');const weight=numeric('body-weight'),height=numeric('body-height');return [{label:'허리 / 엉덩이 비율',value:w!==null&&h>0?(w/h).toFixed(3):'계산 전'},{label:'체질량지수 (BMI)',value:weight!==null&&height>0?(weight/(height/100)**2).toFixed(1)+' kg/m²':'계산 전'}];}
 if(key==='sarcopenia'){const mass=numeric('asm-mass'),height=numeric('asm-height');return [{label:'ASM / 키² (계산값)',value:mass!==null&&height>0?(mass/(height/100)**2).toFixed(2)+' kg/m²':'계산 전'}];}
 return [];
}
