export const spinalCoverFields=[
 {id:'sca-cover-number',label:'No.',type:'text'},
 {id:'sca-cover-height',label:'키',type:'number',unit:'cm',min:0,max:300,step:0.01},
 {id:'sca-cover-weight',label:'몸무게',type:'number',unit:'kg',min:0,max:500,step:0.01},
 {id:'sca-cover-condition',label:'기저질환 여부 및 상세',type:'text'},
 {id:'sca-cover-cervical-disc',label:'목디스크 질환',type:'text'},
 {id:'sca-cover-lumbar-disc',label:'허리디스크 질환',type:'text'},
 {id:'sca-cover-history',label:'기타 신체 질환 병력 (수술 유무 포함)',type:'text'},
 {id:'sca-cover-hand',label:'주로 사용하는 손',type:'select',options:['좌','우','양측']},
].map(field=>({...field,optional:true}));

const painField=(id,label)=>({id:'sca-pain-'+id,label,type:'number',unit:'점',min:0,max:10,step:1,optional:true});
const painFields=[
 painField('neck','목'),painField('waist','허리'),
 ...[['shoulder','어깨'],['elbow','팔꿈치'],['wrist','손목'],['hand','손'],['hip','엉덩관절'],['knee','무릎'],['ankle','발목']].flatMap(([id,label])=>[
  painField(id+'-right',label+' · 오른쪽'),painField(id+'-left',label+' · 왼쪽'),
 ]),
];

const neckQuestions=[
 ['통증 강도','지금 통증이 없다','매우 경미하다','보통이다','상당히 심하다','매우 극심하다','상상할 수 있는 최악의 통증이다'],
 ['개인 관리 (씻기, 옷 입기 등)','추가 통증 없이 스스로 돌볼 수 있다','추가 통증이 있지만 스스로 돌볼 수 있다','스스로 돌보는 것이 고통스럽고 느리며 조심스럽다','도움이 필요하지만 대부분의 개인 관리를 할 수 있다','대부분의 개인 관리에 매일 도움이 필요하다','옷을 입지 못하고 씻기 어려워 침대에 머문다'],
 ['무거운 물건 들기','추가 통증 없이 무거운 물건을 들 수 있다','무거운 물건을 들 수 있지만 통증이 더 생긴다','바닥에서는 들기 어렵지만 탁자처럼 편리한 곳에서는 들 수 있다','무거운 물건은 들 수 없지만 편리한 곳에서는 가볍거나 중간 무게의 물건을 들 수 있다','아주 가벼운 물건만 들 수 있다','아무것도 들거나 옮길 수 없다'],
 ['읽기','목 통증 없이 원하는 만큼 읽을 수 있다','목에 약간의 통증이 있어도 원하는 만큼 읽을 수 있다','목에 중간 정도의 통증이 있어도 원하는 만큼 읽을 수 있다','목에 중간 정도의 통증이 있어 원하는 만큼 읽을 수 없다','목에 극심한 통증이 있어 거의 읽을 수 없다','전혀 읽을 수 없다'],
 ['두통','두통이 전혀 없다','드물게 약간의 두통이 있다','드물게 중간 정도의 두통이 있다','자주 중간 정도의 두통이 있다','자주 극심한 두통이 있다','거의 항상 두통이 있다'],
 ['집중하기','어려움 없이 원하는 때 충분히 집중한다','약간 어렵지만 원하는 때 충분히 집중한다','집중하려 할 때 중간 정도의 어려움이 있다','집중하려 할 때 많은 어려움이 있다','집중하려 할 때 극심한 어려움이 있다','전혀 집중할 수 없다'],
 ['작업','원하는 만큼 일할 수 있다','평소의 일만 할 수 있다','평소 작업의 대부분을 할 수 있다','평소의 일을 할 수 없다','거의 어떤 일도 할 수 없다','일을 전혀 할 수 없다'],
 ['운전','목 통증 없이 운전할 수 있다','목에 약간의 통증이 있어도 원하는 만큼 운전한다','목에 중간 정도의 통증이 있어도 원하는 만큼 운전한다','목에 중간 정도의 통증이 있어 원하는 만큼 운전할 수 없다','목에 극심한 통증이 있어 전혀 운전할 수 없다','차를 전혀 몰 수 없다'],
 ['수면','수면에 문제가 없다','1시간 미만 잠들지 못한다','1~2시간 잠들지 못한다','2~3시간 잠들지 못한다','3~5시간 잠들지 못한다','5~7시간 잠들지 못한다'],
 ['여가활동','목 통증 없이 모든 여가활동에 참여한다','목에 약간의 통증이 있어도 모든 여가활동에 참여한다','평소 여가활동 대부분에 참여할 수 있다','평소 여가활동 중 몇 가지만 할 수 있다','여가활동을 거의 할 수 없다','여가활동을 전혀 할 수 없다'],
];
const neckFields=neckQuestions.map(([label,...choices],index)=>({
 id:'sca-ndi-'+(index+1),label:'NDI · '+label,type:'select',
 options:choices.map((choice,score)=>score+'점 · '+choice),
}));

const backStatements=[
 '요통 때문에 대부분의 시간을 집에서 보낸다.',
 '허리를 편하게 하려고 자주 자세를 바꾼다.',
 '요통 때문에 평소보다 더 천천히 걷는다.',
 '요통 때문에 평소에 하던 집안일을 하나도 하지 않는다.',
 '요통 때문에 계단을 올라갈 때 난간을 잡는다.',
 '요통 때문에 평소보다 자주 누워서 쉰다.',
 '요통 때문에 안락의자에서 일어날 때 무언가를 잡고 의지해야 한다.',
 '요통 때문에 나에게 필요한 일을 다른 사람에게 부탁한다.',
 '요통 때문에 평소보다 천천히 옷을 입는다.',
 '요통 때문에 잠시 동안만 서 있을 수 있다.',
 '요통 때문에 허리를 숙이거나 무릎을 구부리지 않으려고 한다.',
 '요통 때문에 의자에서 일어나기 어렵다.',
 '하루 중 대부분의 시간에 허리가 아프다.',
 '요통 때문에 잠자리에서 돌아눕기 어렵다.',
 '요통 때문에 식욕이 별로 없다.',
 '요통 때문에 양말이나 스타킹을 신기 어렵다.',
 '요통 때문에 짧은 거리만 걸을 수 있다.',
 '요통 때문에 평소보다 잠을 적게 잔다.',
 '요통 때문에 다른 사람의 도움을 받아 옷을 입는다.',
 '요통 때문에 하루 중 대부분을 앉아서 보낸다.',
 '요통 때문에 힘든 집안일을 피한다.',
 '요통 때문에 평소보다 짜증을 더 많이 내고 성질을 더 부린다.',
 '요통 때문에 평소보다 더 천천히 계단을 올라간다.',
 '요통 때문에 대부분의 시간을 침대에 누워 있다.',
];
const backOptions=backStatements.map((statement,index)=>(index+1)+'. '+statement);
const backItems={id:'sca-rmdq-items',label:'요통으로 인한 장애 문항',type:'checks',options:backOptions,optional:true};
const backConfirmation={id:'sca-rmdq-confirmed',label:'요통 장애 설문 확인',type:'select',options:['모든 문항을 확인함']};

export const spinalSurveySections=[
 {key:'pain',title:'부위별 통증 (0–10점)',help:'평소 평균적인 통증이나 불편감을 기록합니다. 통증이 없는 부위는 비워둘 수 있습니다.',fields:painFields},
 {key:'ndi',title:'경부장애척도 (NDI)',help:'각 문항에서 현재 상태를 가장 잘 설명하는 응답을 하나씩 선택합니다.',fields:neckFields},
 {key:'rmdq',title:'요통 장애 설문 (RMDQ)',help:'오늘 상태에 해당하는 문장만 체크합니다. 해당 문장이 없어도 모든 문항을 확인했다면 아래 확인 항목을 선택하세요.',fields:[backItems,backConfirmation]},
];

export function spinalSurveyScores(fields){
 const neckScores=neckFields.map(field=>field.options.indexOf(fields[field.id]));
 const rows=[];
 if(neckScores.every(score=>score>=0)){
  const total=neckScores.reduce((sum,score)=>sum+score,0);
  rows.push({key:'ndi',numeric:total,label:'경부장애척도 (NDI) 총점',value:total+' / 50점'});
 }
 if(fields[backConfirmation.id]===backConfirmation.options[0]){
  const checked=fields[backItems.id];
  const total=Array.isArray(checked)?backOptions.filter(option=>checked.includes(option)).length:0;
  rows.push({key:'rmdq',numeric:total,label:'요통 장애 설문 (RMDQ) 총점',value:total+' / 24점'});
 }
 return rows;
}
