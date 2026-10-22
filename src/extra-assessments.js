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
  text(id('fluency-response'),'유창성 실제 응답'),
  ...words.map((word,i)=>({id:id(`cue-${i}`),label:`${word} · 단서 후 회상 (점수 없음)`,type:'select',options:['단서 없이 회상','범주 단서 후 회상','선다형 단서 후 회상','회상 못함','미실시']})),
  text(id('recall-time'),'지연회상 실시 시각 / 간격'),
 ];
 return {code:k2?'K-MoCA':'MoCA-K',title:k2?'인지기능 평가 · K2 춘천판':'인지기능 평가 · MoCA-K',english:k2?'Korean-Montreal Cognitive Assessment · K2 Chuncheon':'Montreal Cognitive Assessment · Korean',short:k2?'MoCA · K2 춘천판':'MoCA · 한국판',max:30,unit:'30점 · 검사자 채점',items,fields,words,source:k2?'K-MoCA · June 6, 2012 / Version 7.1':'MoCA-K · 2006년 3월 1일',reference:k2?'moca-k2.png':'moca-k.png',instruction:'첨부 검사지와 실시요강에 따라 검사자가 시행하고 점수를 기록합니다. 즉각회상과 단서 후 회상은 총점에 포함하지 않습니다.',note:k2?'K2 춘천판은 첨부 실시요강에 교육년수 가산 규칙이 없어 원점수만 합산합니다. 다른 판의 보정이나 절단점을 적용하지 않습니다.':'한국판은 교육년수 6년 이하일 때 1점을 더하되 총점은 30점을 넘지 않습니다. 교육년수를 입력해야 보정 총점을 확정합니다.',sessionNote:'MoCA의 기억력·지연회상은 동일 검사 세션의 정해진 간격으로 실시합니다. 다음 방문에서 새로 검사할 때는 새 회차를 시작하세요. 여러 날에 걸친 기록은 표준 시행 총점으로 해석하지 않습니다.'};
};
export const extraAssessments={
 'moca-k':makeMoCA('moca-k',false),
 'moca-k2':makeMoCA('moca-k2',true),
 sppb:{code:'SPPB',title:'간이신체기능평가',english:'Short Physical Performance Battery',short:'SPPB',max:12,unit:'3영역 · 12점',items:[score('sppb-balance','균형 검사',4,'일반 자세, 반일렬 자세, 일렬 자세의 유지 시간을 관찰하여 검사자가 0–4점을 선택합니다.'),score('sppb-gait','4m 보행 속도 검사',4,'측정 시간과 수행 가능 여부를 기록하고 검사자가 0–4점을 선택합니다.'),score('sppb-chair','의자 일어서기 · 5회',4,'5회 반복 소요 시간과 수행 가능 여부를 기록하고 검사자가 0–4점을 선택합니다.')],fields:[number('sppb-side','일반 자세 유지'),number('sppb-semi','반일렬 자세 유지'),number('sppb-tandem','일렬 자세 유지'),status('sppb-gait-status','4m 보행 수행'),number('sppb-gait-1','4m 보행 1차'),number('sppb-gait-2','4m 보행 2차'),status('sppb-chair-status','의자 5회 일어서기 수행'),number('sppb-chair-time','의자 5회 일어서기')],note:'첨부 슬라이드의 보행·의자 시간표에는 경계값 공백과 “0초” 표기가 있습니다. 임의로 보정하지 않으며, 시간은 기록하고 점수는 기관에서 사용하는 SPPB 실시 기준에 따라 직접 선택합니다. 선택한 세 영역의 점수만 자동 합산합니다.'},
 grip:{code:'GRIP',title:'악력 검사',english:'Hand Grip Strength',short:'악력',max:null,unit:'좌·우 측정값 · kg',items:[],fields:[{id:'grip-dominant',label:'주사용 손',type:'select',options:['오른손','왼손','양손']},...['right','left'].flatMap(side=>[1,2,3].map(n=>number(`grip-${side}-${n}`,`${side==='right'?'오른손':'왼손'} ${n}차`,'kg',200)))],note:'악력계를 사용하여 측정합니다. 측정한 값 중 좌·우 최고값을 각각 표시하며, 첨부 자료에 없는 정상·위험 절단점을 적용하지 않습니다.'},
 sts:{code:'STS',title:'의자 일어서기 검사',english:'30-second Chair Stand & One Leg STS',short:'의자 일어서기',max:null,unit:'30초 반복 횟수 · 한발 수행',items:[],fields:[number('sts-count','30초 동안 완전히 일어선 횟수','회',100),{id:'sts-arms',label:'상지 도움 사용',type:'select',options:['사용 안 함','사용함','미실시']},status('sts-single-right','오른발 한발 일어서기'),status('sts-single-left','왼발 한발 일어서기')],note:'첨부 그림: 약 17인치 높이의 등받이 있고 팔걸이 없는 의자에서 양팔을 가슴에 교차하여 30초 반복합니다. 상지를 사용하면 중단하고 횟수는 0회로 기록합니다. 종료 시 절반 이상 일어섰으면 1회로 셉니다. 한발 일어서기는 가능/불가능을 별도 기록합니다.'},
 'one-leg':{code:'OLS',title:'한발 서기 검사',english:'One Leg Standing',short:'한발 서기',max:null,unit:'눈 뜨기 · 눈 감기 · 초',items:[],fields:[number('ols-open-right','눈 뜨고 · 오른발 지지'),number('ols-open-left','눈 뜨고 · 왼발 지지'),number('ols-closed-right','눈 감고 · 오른발 지지'),number('ols-closed-left','눈 감고 · 왼발 지지')],note:'첨부 안내: 눈 뜨고 30초 이상, 눈 감고 10초 이상. 발을 무릎 높이까지 들되 무릎에 붙이지 않고, 손은 편한 자세로 둡니다. 실제 시간을 기록하며 자동 진단은 하지 않습니다.'},
 tug:{code:'TUG',title:'일어나 걸어가기 검사',english:'Timed Up and Go',short:'TUG',max:null,unit:'일반 · 인지 · 수동 과제',items:[],fields:[number('tug-distance','보행 거리','m',20),number('tug-original','일반 과제 · 3m 왕복'),number('tug-cognitive','인지 이중과제'),text('tug-cognitive-task','인지 과제 내용 / 오류'),number('tug-manual','수동 이중과제'),text('tug-aid','보조기 / 도움 / 특이사항')],note:'첨부 안내: 일반 과제는 의자에서 일어나 3m 지점을 돌아와 앉는 시간입니다. 인지 과제는 숫자·뺄셈, 수동 과제는 물컵(약 1cm 여유)을 들고 수행합니다. 슬라이드의 횡단보도 속도는 보행시간 설명이며 TUG 위험 절단점으로 사용하지 않습니다.'},
 sarcopenia:{code:'ASM',title:'근육량 · 보행 속도 기록',english:'Muscle Mass & Physical Performance',short:'근육량 · 보행',max:null,unit:'첨부 AWGS 그림의 측정 항목',items:[],fields:[{id:'asm-method',label:'근육량 측정 방법',type:'select',options:['DXA','BIA']},number('asm-mass','사지골격근량 (ASM)','kg',100),number('asm-height','키','cm',250),number('asm-index','장비에서 측정한 ASM 지수','kg/m²',50),number('asm-walk-6m','6m 보행 소요 시간','초',3600),number('asm-chair-5','의자 5회 일어서기 소요 시간','초',3600)],note:'첨부 악력 슬라이드의 AWGS 2019 그림에 있는 근육량(DXA/BIA), 6m 보행, 의자 5회 일어서기 항목의 측정값을 기록합니다. 측정값과 보행 속도만 표시하며 이 도구에서 근감소증 진단을 자동 확정하지 않습니다.'},
 circumference:{code:'BODY',title:'허리·엉덩이·종아리 둘레',english:'Body Circumference Measurements',short:'신체 둘레',max:null,unit:'cm · 허리/엉덩이 비율',items:[],fields:[number('body-weight','체중','kg',500),number('body-height','키','cm',250),number('body-waist','허리 둘레','cm',300),number('body-hip','엉덩이 둘레','cm',300),number('body-calf-right','오른쪽 종아리 둘레','cm',100),number('body-calf-left','왼쪽 종아리 둘레','cm',100),...['right','left'].map(side=>({id:`body-finger-${side}`,label:`${side==='right'?'오른쪽':'왼쪽'} 종아리 핑거링 검사`,type:'select',options:['A · 종아리가 손가락 고리보다 굵음','B · 종아리와 고리가 딱 맞음','C · 종아리가 가늘어 고리가 헐렁함']}))],note:'허리 둘레 ÷ 엉덩이 둘레로 비율을 계산합니다. 엉덩이 둘레가 0 또는 미입력이면 계산하지 않습니다. 첨부 자료에 없는 진단 기준은 추가하지 않습니다.'},
};
export function measurementValueValid(field,value){
 if(value==null||value===''||value==='skipped')return false;
 if(field.type==='number'){const n=Number(value);return Number.isFinite(n)&&n>=field.min&&n<=field.max&&Math.abs(n/field.step-Math.round(n/field.step))<0.000001;}
 if(field.type==='select')return field.options.includes(value);
 if(field.type==='checks')return Array.isArray(value)&&value.every(v=>field.options.includes(v));
 return typeof value==='string';
}
export function computedMeasurements(key,fields={}){
 const numeric=id=>{const field=extraAssessments[key]?.fields.find(f=>f.id===id);return field&&measurementValueValid(field,fields[id])?Number(fields[id]):null;};
 if(key==='grip')return ['right','left'].map(side=>{const values=[1,2,3].map(n=>numeric(`grip-${side}-${n}`)).filter(v=>v!==null);return {label:`${side==='right'?'오른손':'왼손'} 최고 악력`,value:values.length?`${Math.max(...values)} kg`:'미측정'};});
 if(key==='circumference'){const w=numeric('body-waist'),h=numeric('body-hip');const weight=numeric('body-weight'),height=numeric('body-height');return [{label:'허리 / 엉덩이 비율',value:w!==null&&h>0?(w/h).toFixed(3):'계산 전'},{label:'체질량지수 (BMI)',value:weight!==null&&height>0?(weight/(height/100)**2).toFixed(1)+' kg/m²':'계산 전'}];}
 if(key==='sarcopenia'){const mass=numeric('asm-mass'),height=numeric('asm-height'),time=numeric('asm-walk-6m');return [{label:'ASM / 키² (계산값)',value:mass!==null&&height>0?(mass/(height/100)**2).toFixed(2)+' kg/m²':'계산 전'},{label:'6m 보행 속도',value:time>0?(6/time).toFixed(2)+' m/s':'계산 전'}];}
 return [];
}
