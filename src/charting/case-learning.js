// General writing patterns distilled from five supplied forms. No patient narratives,
// diagnoses, identifiers, measured scores, dates, or photos are shipped in this catalog.
export const casePatterns=[
 {id:'supported-upright',exerciseIds:['03-01','03-02'],title:'안정된 앉기 · 몸통 정렬',method:'단단하고 안정된 의자에서 발을 지지하고 몸통을 세워 정중선 유지 연습',cue:'몸통과 골반의 정렬을 스스로 확인하도록 구두 단서 제공',tools:['chair'],capability:'sitting'},
 {id:'cushion-supported',exerciseIds:['03-01'],title:'쿠션을 활용한 앉은 자세',method:'안정된 의자에서 쿠션으로 팔과 몸통을 지지한 상태로 바른 앉은 자세 연습',cue:'지지면과 보조 도구를 확인하며 편안한 정렬을 찾도록 설명',tools:['chair'],capability:'sitting'},
 {id:'sitting-weight-shift',exerciseIds:['03-03','03-04','03-05'],title:'앉은 자세 · 체중 이동',method:'발을 지지한 앉은 자세에서 작은 범위로 체중을 이동하고 정중선으로 돌아오기',cue:'움직임 범위와 속도를 조절하도록 구두 단서 제공',tools:['chair'],capability:'sitting'},
 {id:'scapula-alignment',exerciseIds:['01-08','03-10'],title:'상지 움직임 · 어깨뼈 정렬',method:'현재 지지된 자세에서 팔 움직임과 어깨뼈 모으기를 연습',cue:'과도한 어깨 들기와 몸통 보상을 관찰하며 동작 설명',tools:[],capability:'bed'},
 {id:'breathing-relaxation',exerciseIds:['01-09'],title:'흉곽 움직임 · 호흡',method:'지지된 반쯤 누운 자세에서 편안하게 팔을 벌리고 깊은 호흡 연습',cue:'호흡과 동작 속도를 맞추고 상체의 힘을 편안하게 조절하도록 설명',tools:['bed'],capability:'bed'},
 {id:'visual-heel-slide',exerciseIds:['01-02'],title:'시각 확인 · 하지 움직임',method:'누운 자세에서 발끝과 움직임 궤적을 보며 발뒤꿈치를 천천히 미끄러뜨려 무릎 굽힘·폄 연습',cue:'정확한 궤적과 느린 속도를 유지하도록 시각·구두 단서 제공',tools:['bed'],capability:'bed'},
 {id:'bridge-control',exerciseIds:['01-06'],title:'브리지 · 골반 조절',method:'무릎을 세운 바로누운 자세에서 엉덩이 근육에 힘을 주며 작은 범위로 골반 들기',cue:'허리를 과도하게 젖히지 않고 엉덩이 근육에 집중하도록 설명',tools:['bed'],capability:'bed'},
 {id:'band-bridge',exerciseIds:['01-06'],title:'브리지 · 밴드 변형',method:'바로누운 자세에서 양 무릎에 탄력밴드를 두르고 무릎 방향을 유지하며 골반 들기',cue:'무릎 방향과 골반 높이를 확인하며 저항을 개별 조절하도록 설명',tools:['bed','band'],capability:'bed'},
 {id:'sitting-band',exerciseIds:['03-08'],title:'앉아서 고관절 벌림',method:'안정된 의자에 앉아 양 무릎에 탄력밴드를 두르고 고관절 벌림 연습',cue:'무릎과 발끝 방향을 맞추고 몸통 보상을 관찰하도록 설명',tools:['chair','band'],capability:'sitting'},
 {id:'pre-standing',exerciseIds:['04-01','04-03','04-06'],title:'기립 준비 · 앞쪽 체중 이동',method:'안정된 의자에서 발 위치를 확인하고 몸통을 앞으로 이동하며 기립 준비 동작 연습',cue:'도구를 과도하게 당기지 않고 발로 지지하도록 구두 단서 제공',tools:['chair'],capability:'transfer'},
 {id:'supported-single-leg',exerciseIds:['05-07'],title:'지지한 한발 서기',method:'고정된 지지물을 잡고 지지하는 발에 체중을 이동한 뒤 반대 발 들어 올리기',cue:'곁에서 안전을 확인하며 자세와 지지 수준을 개별 조절하도록 설명',tools:['support'],capability:'standing'},
 {id:'turn-preparation',exerciseIds:['05-03','06-01','06-09','07-07'],title:'서기 · 방향 전환 준비',method:'안정된 지지하에 좌우 체중 이동을 확인하고 작은 걸음으로 방향 전환 연습',cue:'디딤발의 지지와 발 위치를 확인하며 속도를 조절하도록 설명',tools:['support'],capability:'standing'}
];
export const caseFocusChoices=['자세 정렬','몸통 조절','상지 움직임','호흡·이완','동작 조절·협응','골반·하지 지지','체중 이동','기립 준비','균형·한발 지지','방향 전환'];
const focusByPattern={
 'supported-upright':['자세 정렬','몸통 조절'],'cushion-supported':['자세 정렬','몸통 조절'],'sitting-weight-shift':['체중 이동','몸통 조절'],'scapula-alignment':['자세 정렬','상지 움직임'],'breathing-relaxation':['호흡·이완'],'visual-heel-slide':['동작 조절·협응'],'bridge-control':['골반·하지 지지'],'band-bridge':['골반·하지 지지'],'sitting-band':['골반·하지 지지'],'pre-standing':['기립 준비','체중 이동'],'supported-single-leg':['균형·한발 지지'],'turn-preparation':['체중 이동','방향 전환']
};
export function matchedCaseFocus(exerciseId,focus=[]){return [...new Set(casePatterns.filter(x=>x.exerciseIds.includes(exerciseId)).flatMap(x=>focusByPattern[x.id]||[]))].filter(x=>focus.includes(x));}
export const feedbackChoices=[['suitable','현재 대상자에게 적합'],['adjust','다음 회차 조정 필요'],['avoid','다음 추천에서 제외']];
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const reviewDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
const clean=value=>typeof value==='string'?value.trim().slice(0,1500):'';
export function reviewedExperience(patient,visit,{enabled=true}={}){
 const result={byExercise:new Map(),reviewCount:0,feedbackCount:0};if(!enabled||!patient?.id||!visit?.id||!validDate(visit.date))return result;
 const snapshots=[],seen=new Set();
 for(const previous of patient.visits||[]){
  if(previous.id===visit.id||!(Number(previous.sequence)<Number(visit.sequence))||!validDate(previous.date)||previous.date>visit.date)continue;
  for(const reviewed of [...(Array.isArray(previous.chart?.history)?previous.chart.history:[]),previous.chart?.reviewed].filter(Boolean)){
   if(!reviewed.byAccount||!reviewed.byName||!reviewed.at||!Number.isFinite(Date.parse(reviewed.at))||typeof reviewed.source!=='string'||reviewDay.format(new Date(reviewed.at))>visit.date)continue;
   const key=previous.id+':'+(reviewed.id||reviewed.at);if(seen.has(key))continue;
   let source;try{source=JSON.parse(reviewed.source);}catch{continue;}
   if(!source||typeof source!=='object'||Array.isArray(source)||source.patientId!==patient.id||source.visitId!==previous.id||!Array.isArray(source.performed)||!validDate(source.serviceDate)||source.serviceDate>visit.date)continue;
   seen.add(key);snapshots.push({reviewed,source,sequence:previous.sequence});
  }
 }
 snapshots.sort((a,b)=>a.source.serviceDate.localeCompare(b.source.serviceDate)||Number(a.sequence)-Number(b.sequence)||Date.parse(a.reviewed.at)-Date.parse(b.reviewed.at));result.reviewCount=snapshots.length;
 for(const {reviewed,source,sequence} of snapshots){
  const grouped=new Map();for(const row of source.performed){if(!row||!['done','stopped','notdone'].includes(row.status)||typeof row.exerciseId!=='string'||!feedbackChoices.some(([value])=>row.feedback===value))continue;
   // A favorable selection cannot silently turn a stopped movement or increased pain into success.
   if(row.feedback==='suitable'&&(row.status!=='done'||clean(row.stopReason)))continue;
   if(row.feedback==='suitable'&&source.beforePain!==''&&source.afterPain!==''&&Number.isFinite(Number(source.beforePain))&&Number.isFinite(Number(source.afterPain))&&Number(source.afterPain)>Number(source.beforePain))continue;
   const prior=grouped.get(row.exerciseId),weight={suitable:1,adjust:2,avoid:3};if(!prior||weight[row.feedback]>=weight[prior.feedback])grouped.set(row.exerciseId,row);
  }
  for(const [id,row] of grouped){result.feedbackCount++;result.byExercise.set(id,{feedback:row.feedback,sequence,reviewedAt:reviewed.at,method:clean(row.method),cue:clean(row.cue),tools:Array.isArray(source.context?.equipment)?source.context.equipment.filter(x=>typeof x==='string'):[],capability:source.context?.capability||''});}
 }
 return result;
}
export function methodExamples(patient,visit,exerciseId,{enabled=true,experience}={}){
 const generic=casePatterns.filter(item=>item.exerciseIds.includes(exerciseId)).map(item=>({...item,origin:'첨부 사례에서 정리한 일반 작성 패턴' }));
 const learned=enabled?(experience||reviewedExperience(patient,visit)).byExercise.get(exerciseId):undefined;
 if(learned?.feedback==='suitable'&&learned.method)generic.unshift({id:'reviewed-'+exerciseId,title:`이 대상자 ${learned.sequence}회차 검토 방법`,method:learned.method,cue:learned.cue,tools:learned.tools,capability:learned.capability,origin:'같은 대상자의 검토 완료 이력'});
 return generic;
}
