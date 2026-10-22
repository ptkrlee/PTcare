import library from './exercises.json' with {type:'json'};
import groups from './categories.json' with {type:'json'};
import {getAssessment,summarize} from '../data.js';
import {measurementValueValid} from '../extra-assessments.js';
export {groups};
export const capabilities=[['bed','침상에서 운동 가능'],['sitting','안정적으로 앉기 가능'],['transfer','도움을 받아 자리 이동 가능'],['standing','지지물을 사용한 서기 가능'],['dynamic','지지하에 동적 서기 가능'],['walking','보조·감독하 실내 보행 가능'],['outdoor','치료사 확인하 실외 활동 가능']];
export const goals=['침상 이동','앉은 균형','일어서기','서기 균형','보행','일상생활','실외 활동','상지 움직임','하지 근력'];
export const equipment=[['bed','안전한 침상'],['chair','고정된 의자'],['support','고정된 지지물'],['band','탄력밴드'],['walker','보행기'],['cane','지팡이'],['wheelchair','휠체어'],['step','낮은 발판'],['rail','난간'],['cup','빈 컵'],['towel','수건']];
const groupGoals={'01':['침상 이동','하지 근력'],'02':['침상 이동','앉은 균형'],'03':['앉은 균형','하지 근력'],'04':['일어서기','하지 근력'],'05':['서기 균형','하지 근력'],'06':['서기 균형','보행'],'07':['보행'],'08':['일상생활'],'09':['실외 활동','보행']};
const baseLevel={'01':0,'02':1,'03':1,'04':3,'05':3,'06':4,'07':5,'08':1,'09':6};
const required={
 '03-08':['band'],'04-04':['chair'],'05-01':['support'],'05-02':['support'],'05-04':['support'],'05-07':['support'],'05-08':['support'],'05-09':['support'],'05-10':['support'],'06-05':['support'],'06-07':['support','step'],'07-01':['walker'],'07-02':['cane'],'08-02':['wheelchair','chair'],'08-03':['support'],'08-06':['cup'],'08-07':['towel'],'09-04':['rail'],
};
const specificLevels={'04-01':1,'04-02':1,'04-03':1,'08-01':2,'08-02':2,'08-03':2,'08-09':3,'08-10':5};
export const exercises=library.map(item=>({...item,minLevel:specificLevels[item.id]??baseLevel[item.category],goals:[...groupGoals[item.category],...(/팔|어깨|견갑|컵|세면/.test(item.title)?['상지 움직임']:[])],required:[...((['01','02'].includes(item.category))?['bed']:['03','04'].includes(item.category)?['chair']:[]),...(required[item.id]||[])],prone:['02-07','02-08'].includes(item.id)}));
const byId=new Map(exercises.map(ex=>[ex.id,ex]));
export const exerciseById=id=>byId.get(id);
export function newChart(serviceDate=''){
 return {version:1,serviceDate,therapist:'',startTime:'',duration:'',subjective:'',beforePain:'',afterPain:'',response:'',education:'',nextPlan:'',noExerciseReason:'',context:{capability:'',goals:[],equipment:[],safety:'',precautions:'',instruction:'',proneAllowed:false,assessmentVisitId:''},plan:[],performed:[],draft:'',draftSource:'',generatedAt:null,reviewed:null,history:[]};
}
export function chartFor(visit){const base=newChart(visit.date),saved=visit.chart||{};return {...base,...saved,context:{...base.context,...saved.context},plan:saved.plan||[],performed:saved.performed||[],history:saved.history||[]};}
export function assessmentBasis(patient,visitId){
 const v=patient.visits.find(visit=>visit.id===visitId);if(!v)return [];
 return Object.entries(v.forms||{}).flatMap(([key,form])=>{
  let a;try{a=getAssessment(key,form.mobility);}catch{return [];}if(!a)return [];
  const s=summarize(a,form.answers,form.fields);const measures=(a.fields||[]).filter(f=>measurementValueValid(f,form.fields?.[f.id])).map(f=>({title:f.label,value:form.fields[f.id],unit:f.unit||''}));
  if(!s.answered&&!s.skipped&&!measures.length)return [];
  return [{key,title:a.title,visitId:v.id,sequence:v.sequence,date:v.date,total:s.total,max:a.max,complete:s.complete,answered:s.answered,skipped:s.skipped,measures,items:s.selected.filter(row=>row.option).map(({item,option})=>({id:item.id,title:item.title,score:option.score,max:Math.max(...item.options.map(o=>o.score)),label:option.label})),updatedAt:form.updatedAt}];
 });
}
const deficitGoals={
 'bbs-0':['일어서기'],'bbs-1':['서기 균형'],'bbs-2':['앉은 균형'],'bbs-3':['일어서기'],'bbs-4':['일상생활'],'bbs-7':['서기 균형'],'bbs-10':['보행'],'bbs-11':['보행'],'bbs-13':['서기 균형'],
 'mbi-0':['일상생활'],'mbi-2':['상지 움직임'],'mbi-3':['일상생활'],'mbi-4':['일어서기'],'mbi-5':['일상생활'],'mbi-8':['보행'],'mbi-9':['일상생활'],
};
export function recommend(patient,visit,chart){
 const c=chart.context||{},basis=assessmentBasis(patient,c.assessmentVisitId||visit.id);
 const level=capabilities.findIndex(([key])=>key===c.capability);
 if(c.safety!=='cleared')return {items:[],basis,blocked:c.safety==='concern'?'운동 전 확인이 필요한 증상·제한이 있어 자동 추천을 보류합니다. 상태를 평가하고 필요한 조치를 먼저 확인하세요.':'현재 상태와 운동 제한 여부를 치료사가 확인한 뒤 추천 후보를 만들 수 있습니다.'};
 if(c.precautions?.trim())return {items:[],basis,blocked:'주의·제한사항이 기록되어 있습니다. 자동 추천은 보류하고 치료사가 개별적으로 운동을 검토해 선택하세요.'};
 if(level<0)return {items:[],basis,blocked:'치료사가 직접 확인한 현재 가능한 자세·이동 수준을 선택해 주세요.'};
 const signals=basis.flatMap(b=>b.items.filter(item=>item.score<item.max&&deficitGoals[item.id]).map(item=>({goals:deficitGoals[item.id],reason:`${b.title} · ${item.title}: ${item.score}/${item.max}점 (${item.label})`}))); 
 const candidates=exercises.filter(ex=>ex.minLevel<=level&&ex.required.every(item=>(c.equipment||[]).includes(item))&&(!ex.prone||c.proneAllowed));
 const ranked=candidates.map(ex=>{
  const matched=(c.goals||[]).filter(goal=>ex.goals.includes(goal));
  const relevant=signals.filter(signal=>signal.goals.some(goal=>ex.goals.includes(goal)));
  const reasons=[...matched.map(goal=>`치료사가 선택한 목표: ${goal}`),...relevant.slice(0,2).map(signal=>signal.reason)];
  const score=matched.length*10+Math.min(relevant.length,3)*3+ex.minLevel;
  return {...ex,rank:score,reasons:reasons.length?reasons:[`치료사가 확인한 가능 수준: ${capabilities[level][1]}`]};
 }).sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id));
 // Keep variety rather than recommending six variants of a single movement category.
 const selected=[],perGroup=new Map();for(const ex of ranked){if((perGroup.get(ex.category)||0)>=2)continue;selected.push(ex);perGroup.set(ex.category,(perGroup.get(ex.category)||0)+1);if(selected.length===6)break;}
 return {items:selected,basis,blocked:selected.length?'':'가능 자세에 맞는 도구를 확인해 주세요. 치료사가 목록에서 운동을 직접 선택할 수도 있습니다.'};
}
export function newPlanItem(exerciseId,reasons=[]){return {id:crypto.randomUUID(),exerciseId,reasons,sets:'',reps:'',seconds:'',minutes:'',assistance:'',memo:''};}
export function newPerformedItem(exerciseId){return {...newPlanItem(exerciseId),status:'done',reaction:'',stopReason:''};}
export const doseFields=[['sets','세트','세트',100],['reps','반복','회',1000],['seconds','유지 시간','초',3600],['minutes','시간','분',240]];
export function doseErrors(item){return doseFields.flatMap(([key,label,,max])=>{const value=item[key];if(value===''||value==null)return [];const n=Number(value);return Number.isFinite(n)&&n>0&&n<=max&&(key==='minutes'||key==='seconds'||Number.isInteger(n))?[]:[`${label} 입력을 확인해 주세요.`];});}
export function doseText(item){return doseFields.filter(([key])=>item[key]!==''&&item[key]!=null).map(([key,label,unit])=>`${key==='sets'||key==='reps'?'':label+' '}${item[key]}${unit}`).join(' · ');}
export function noteSource(patient,visit,chart){
 return JSON.stringify({patientId:patient.id,identity:patient.identity,visitId:visit.id,serviceDate:chart.serviceDate,therapist:chart.therapist,startTime:chart.startTime,duration:chart.duration,subjective:chart.subjective,beforePain:chart.beforePain,afterPain:chart.afterPain,response:chart.response,education:chart.education,nextPlan:chart.nextPlan,noExerciseReason:chart.noExerciseReason,context:chart.context,plan:chart.plan,performed:chart.performed,basis:assessmentBasis(patient,chart.context.assessmentVisitId||visit.id)});
}
export function chartIssues(chart){
 const issues=[];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(chart.serviceDate))issues.push('실제 서비스 날짜를 입력해 주세요.');
 for(const [key,label] of [['beforePain','시작 전 통증'],['afterPain','종료 후 통증']])if(chart[key]!==''&&chart[key]!=null&&(!Number.isInteger(Number(chart[key]))||Number(chart[key])<0||Number(chart[key])>10))issues.push(`${label}은 0–10의 정수로 입력해 주세요.`);
 if(chart.duration!==''&&(!Number.isFinite(Number(chart.duration))||Number(chart.duration)<=0||Number(chart.duration)>480))issues.push('실제 서비스 시간을 확인해 주세요.');
 if(!chart.performed.some(row=>row.status==='done'||row.status==='stopped')&&!chart.noExerciseReason?.trim())issues.push('실제로 실시·시도한 운동을 확인하거나 운동 미실시 사유를 입력해 주세요.');
 for(const row of chart.performed){const ex=exerciseById(row.exerciseId);if(!ex){issues.push('확인할 수 없는 운동 항목입니다.');continue;}for(const error of doseErrors(row))issues.push(`${ex.title}: ${error}`);if(row.status==='stopped'&&!row.stopReason?.trim())issues.push(`${ex.title}: 중단 사유를 입력해 주세요.`);}
 return [...new Set(issues)];
}
export function buildProgressNote(patient,visit,chart){
 const issues=chartIssues(chart);if(issues.length)return {text:'',issues};
 const lines=[`방문운동 경과기록`,`${chart.serviceDate} · ${visit.sequence}회차 · ${patient.identity.name} (${patient.identity.birth||'생년월일 미입력'})`];
 if(chart.therapist.trim())lines.push(`작성자: ${chart.therapist.trim()}`);
 if(chart.startTime||chart.duration)lines.push(`서비스: ${chart.startTime||'시작시각 미기록'}${chart.duration?' · '+chart.duration+'분':''}`);
 lines.push('','[시작 전 상태]',chart.subjective.trim()||'주관적 상태 미기록');
 if(chart.beforePain!=='')lines.push(`시작 전 통증: ${chart.beforePain}/10`);
 if(chart.context.precautions?.trim())lines.push(`주의·제한사항: ${chart.context.precautions.trim()}`);
 const basis=assessmentBasis(patient,chart.context.assessmentVisitId||visit.id);
 lines.push('','[참고 평가]');
 if(!basis.length)lines.push('기록된 참고 평가 없음.');
 for(const b of basis)lines.push(`${b.sequence}회차 (${b.date}) · ${b.title}: ${b.max===null?b.measures.map(m=>`${m.title} ${Array.isArray(m.value)?m.value.join(', '):m.value}${m.unit}`).join(' / '):`${b.complete?'총점':'미완료 부분 점수'} ${b.total}/${b.max}점 · ${b.answered}항목 평가${b.skipped?' · 미평가 '+b.skipped+'항목':''}`}`);
 lines.push('','[실제 수행 운동]');
 let count=0;
 for(const row of chart.performed){
  const ex=exerciseById(row.exerciseId);if(row.status==='notdone')continue;
  if(row.status==='stopped'){lines.push(`${++count}. ${ex.title}을 시도하였으나 중단함. 중단 사유: ${row.stopReason.trim()}`);}
  else lines.push(`${++count}. ${ex.sentence}`);
  const details=[doseText(row),row.assistance?`도움 수준: ${row.assistance}`:'',row.reaction?`실제 반응: ${row.reaction}`:'',row.memo?`메모: ${row.memo}`:''].filter(Boolean);
  if(details.length)lines.push('   '+details.join(' / '));
 }
 if(!count)lines.push('실시 확인된 운동 없음.');
 if(chart.noExerciseReason?.trim())lines.push(`운동 미실시/제한 사유: ${chart.noExerciseReason.trim()}`);
 lines.push('','[실제 반응 · 관찰]',chart.response.trim()||'반응·변화 미기록. 기능 향상 여부는 확인되지 않음.');
 if(chart.afterPain!=='')lines.push(`종료 후 통증: ${chart.afterPain}/10`);
 if(chart.education.trim())lines.push('','[교육 · 안내]',chart.education.trim());
 lines.push('','[다음 방문 계획]',chart.nextPlan.trim()||'다음 계획 미기록');
 return {text:lines.join('\n'),issues:[]};
}
export function canReview(patient,visit,chart){const issues=chartIssues(chart);if(!chart.draft.trim())issues.push('먼저 경과기록 초안을 만들어 주세요.');if(chart.draftSource!==noteSource(patient,visit,chart))issues.push('입력이나 참고 평가가 바뀌었습니다. 초안을 다시 생성해 확인해 주세요.');if(!chart.therapist.trim())issues.push('검토할 치료사 성명을 입력해 주세요.');return [...new Set(issues)];}
