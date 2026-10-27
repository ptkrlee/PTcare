import {basicSafety} from '../basic-assessment.js';
import {latestAssessments} from '../service-plan.js';
import {criterionState,timedCriterion,bbsTimed} from '../timed-criteria.js';
import {workflowProgress} from '../assessment-workflow.js';
import library from './exercises.json' with {type:'json'};
import groups from './categories.json' with {type:'json'};
import {formFor} from '../records.js';
import {getAssessment,summarize} from '../data.js';
import {computedMeasurements,measurementValueValid} from '../extra-assessments.js';
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
const sidedExercises=new Set(['01-01','01-02','01-03','01-04','01-07','01-08','01-10','02-01','02-02','02-03','02-08','03-03','03-05','03-06','03-07','03-09','05-02','05-06','05-07','06-01','06-04','06-05','06-06','06-07','06-08','06-09','06-10']);
export const exercises=library.map(item=>({...item,bilateral:sidedExercises.has(item.id),minLevel:specificLevels[item.id]??baseLevel[item.category],goals:[...groupGoals[item.category],...(/팔|어깨|견갑|컵|세면/.test(item.title)?['상지 움직임']:[])],required:[...((['01','02'].includes(item.category))?['bed']:['03','04'].includes(item.category)?['chair']:[]),...(required[item.id]||[])],prone:['02-07','02-08'].includes(item.id)}));
const byId=new Map(exercises.map(ex=>[ex.id,ex]));
export const exerciseById=id=>byId.get(id);
export function newChart(serviceDate=''){
 return {version:2,serviceDate,therapist:'',startTime:'',duration:'',subjective:'',beforePain:'',afterPain:'',response:'',homework:'',nextVisitDate:'',nextVisitTime:'',nextPlan:'',noExerciseReason:'',context:{capability:'',goals:[],equipment:[],safety:'',precautions:'',instruction:'',proneAllowed:false,assessmentVisitId:''},plan:[],performed:[],draft:'',draftSource:'',generatedAt:null,reviewed:null,history:[]};
}
export function chartFor(visit){const base=newChart(visit.date),saved=visit.chart||{};return {...base,...saved,homework:saved.homework??saved.education??'',context:{...base.context,...saved.context},plan:saved.plan||[],performed:saved.performed||[],history:saved.history||[]};}
export function assessmentBasis(patient,visitId){
 const v=patient.visits.find(visit=>visit.id===visitId);if(!v)return [];
 const keys=new Set(Object.keys(v.forms||{}));if(v.forms?.sarcopenia?.fields?.['asm-chair-5']!==undefined)keys.add('sts');
 return [...keys].flatMap(key=>{const form=formFor(v,key);
  let a;try{a=getAssessment(key,form.mobility);}catch{return [];}if(!a)return [];
  const s=workflowProgress(a,form,summarize(a,form.answers,form.fields));const measures=(a.fields||[]).filter(f=>measurementValueValid(f,form.fields?.[f.id])).map(f=>({title:f.label,value:form.fields[f.id],unit:f.unit||''}));
  for(const field of a.fields||[]){const c=criterionState(field.id,form.fields);if(c.active&&c.valid)measures.push({title:field.label+' · 기준 확인',value:(c.confirmed?timedCriterion(field.id,form.fields).pass:'기준 미충족')+(c.actual===undefined?' (실제 시간 미입력)':''),unit:''});}
  for(const item of a.items){const rule=bbsTimed[item.id];if(rule)for(const side of rule.bilateral?['right','left']:['']){const id=item.id+'-seconds'+(side?'-'+side:'');if(form.fields[id]!==undefined&&form.fields[id]!==''&&form.fields[id]!=='skipped'&&Number.isFinite(Number(form.fields[id]))&&Number(form.fields[id])>=0&&Number(form.fields[id])<=3600)measures.push({title:item.title+(side?' · '+(side==='right'?'우':'좌'):'')+' 실제 시간',value:form.fields[id],unit:'초'});}}
  if(!s.answered&&!s.skipped&&!measures.length)return [];
  return [{key,title:a.title,visitId:v.id,sequence:v.sequence,date:v.date,total:s.total,max:a.max,complete:s.complete,answered:s.answered,skipped:s.skipped,measures,computed:computedMeasurements(key,form.fields,{birth:patient.identity.birth,date:v.date}),items:s.selected.filter(row=>row.option).map(({item,option})=>({id:item.id,title:item.title,score:option.score,max:Math.max(...item.options.map(o=>o.score)),label:option.label})),updatedAt:form.updatedAt}];
 });
}
const deficitGoals={
 'bbs-0':['일어서기'],'bbs-1':['서기 균형'],'bbs-2':['앉은 균형'],'bbs-3':['일어서기'],'bbs-4':['일상생활'],'bbs-7':['서기 균형'],'bbs-10':['보행'],'bbs-11':['보행'],'bbs-13':['서기 균형'],
 'mbi-0':['일상생활'],'mbi-2':['상지 움직임'],'mbi-3':['일상생활'],'mbi-4':['일어서기'],'mbi-5':['일상생활'],'mbi-8':['보행'],'mbi-9':['일상생활'],
};
export function recommend(patient,visit,chart){
 const c=chart.context||{},basis=assessmentBasis(patient,c.assessmentVisitId||visit.id);
 const latestBasic=latestAssessments(patient).find(x=>x.key==='basic');if(latestBasic&&basicSafety(latestBasic.f.fields).length)return {items:[],basis,blocked:'기초평가 안전선별에 추가 확인할 내용이 있습니다. 현재 상태를 확인한 뒤 추천을 검토하세요.'};
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
 // Keep variety rather than recommending three variants of a single movement category.
 const selected=[],perGroup=new Map();for(const ex of ranked){if((perGroup.get(ex.category)||0)>=2)continue;selected.push(ex);perGroup.set(ex.category,(perGroup.get(ex.category)||0)+1);if(selected.length===3)break;}
 return {items:selected,basis,blocked:selected.length?'':'가능 자세에 맞는 도구를 확인해 주세요. 치료사가 목록에서 운동을 직접 선택할 수도 있습니다.'};
}
export const defaultDose=Object.freeze({sets:'3',reps:'10',seconds:'3',minutes:''});
export const sides=[['total','전체 횟수'],['both','좌우 각각'],['left','왼쪽'],['right','오른쪽']];
export function newPlanItem(exerciseId,reasons=[]){return {id:crypto.randomUUID(),exerciseId,reasons,...defaultDose,side:exerciseById(exerciseId)?.bilateral?'both':'total',assistance:'',memo:''};}
export function newPerformedItem(exerciseId){return {...newPlanItem(exerciseId),sets:'',reps:'',seconds:'',minutes:'',status:'done',reaction:'',stopReason:''};}
export const doseFields=[['sets','세트','세트',100],['reps','반복','회',1000],['seconds','유지 시간','초',3600],['minutes','시간','분',240]];
export function doseErrors(item){return doseFields.flatMap(([key,label,,max])=>{const value=item[key];if(value===''||value==null)return [];const n=Number(value);return Number.isFinite(n)&&n>0&&n<=max&&(key==='minutes'||key==='seconds'||Number.isInteger(n))?[]:[`${label} 입력을 확인해 주세요.`];});}
export function doseText(item){return doseFields.filter(([key])=>item[key]!==''&&item[key]!=null).map(([key,label,unit])=>`${key==='reps'?({both:'좌우 각 ',left:'왼쪽 ',right:'오른쪽 '}[item.side]||''):key==='sets'?'':label+' '}${item[key]}${unit}`).join(' · ');}
export const exercisePurpose=ex=>{const index=ex.sentence.indexOf(',');return index>=0?ex.sentence.slice(index+1).trim():'';};
export function noteSource(patient,visit,chart){
 return JSON.stringify({patientId:patient.id,identity:patient.identity,visitId:visit.id,serviceDate:chart.serviceDate,therapist:chart.therapist,startTime:chart.startTime,duration:chart.duration,subjective:chart.subjective,beforePain:chart.beforePain,afterPain:chart.afterPain,response:chart.response,homework:chart.homework??chart.education??'',nextVisitDate:chart.nextVisitDate||'',nextVisitTime:chart.nextVisitTime||'',nextPlan:chart.nextPlan,noExerciseReason:chart.noExerciseReason,context:chart.context,plan:chart.plan,performed:chart.performed,serviceRecord:chart.serviceRecord?{...chart.serviceRecord,photos:(chart.serviceRecord.photos||[]).map(photo=>photo?{id:photo.id,width:photo.width,height:photo.height,caption:photo.caption,addedAt:photo.addedAt}:null)}:null,basis:assessmentBasis(patient,chart.context.assessmentVisitId||visit.id)});
}
export function chartIssues(chart){
 const issues=[];
 if(chart.serviceRecord?.status==='미실시'&&chart.performed.some(row=>row.status==='done'))issues.push('서비스 미실시 상태와 실제 실시 운동이 함께 기록되어 있습니다. 상태를 확인해 주세요.');
 for(const [key,label] of [['serviceDate','서비스 날짜'],['nextVisitDate','다음 방문 날짜']])if(chart[key]&&!validDate(chart[key]))issues.push(`${label}를 확인해 주세요.`);
 if(chart.nextVisitTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(chart.nextVisitTime))issues.push('다음 방문 시간을 확인해 주세요.');
 for(const [key,label] of [['beforePain','시작 전 통증'],['afterPain','종료 후 통증']])if(chart[key]!==''&&chart[key]!=null&&(!Number.isInteger(Number(chart[key]))||Number(chart[key])<0||Number(chart[key])>10))issues.push(`${label}은 0–10의 정수로 입력해 주세요.`);
 if(chart.duration!==''&&(!Number.isFinite(Number(chart.duration))||Number(chart.duration)<=0||Number(chart.duration)>480))issues.push('실제 서비스 시간을 확인해 주세요.');
 for(const row of [...chart.plan,...chart.performed]){const ex=exerciseById(row.exerciseId);if(!ex){issues.push('확인할 수 없는 운동 항목입니다.');continue;}if(row.status==='notdone')continue;for(const error of doseErrors(row))issues.push(`${ex.title}: ${error}`);}
 return [...new Set(issues)];
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function buildProgressNote(patient,visit,chart){
 const issues=chartIssues(chart);if(issues.length)return {text:'',issues};
 const clean=value=>String(value??'').trim();
 const lines=['방문운동 경과기록',[chart.serviceDate,visit.sequence?`${visit.sequence}회차`:'',[patient.identity.name,patient.identity.birth?`(${patient.identity.birth})`:''].filter(Boolean).join(' ')].filter(Boolean).join(' · ')];
 const section=(title,rows)=>{const filled=rows.filter(value=>clean(value));if(filled.length)lines.push('',`[${title}]`,...filled);};
 if(clean(chart.therapist))lines.push(`작성자: ${clean(chart.therapist)}`);
 if(chart.startTime||chart.duration)lines.push('서비스: '+[chart.startTime,chart.duration?`${chart.duration}분`:''].filter(Boolean).join(' · '));
 const c=chart.context;
 section('시작 전 상태',[clean(chart.subjective),chart.beforePain!==''&&chart.beforePain!=null?`시작 전 통증: ${chart.beforePain}/10`:'',clean(c.precautions)?`주의·제한사항: ${clean(c.precautions)}`:'',capabilities.find(([key])=>key===c.capability)?.[1],c.goals.length?`목표: ${c.goals.join(', ')}`:'',c.equipment.length?`확인한 도구: ${equipment.filter(([key])=>c.equipment.includes(key)).map(([,label])=>label).join(', ')}`:'',c.safety==='cleared'?'치료사가 현재 운동 제한 및 새로운 이상 증상이 없음을 확인함.':c.safety==='concern'?'증상 또는 제한이 있어 확인 필요.':'',c.proneAllowed?'엎드린 자세 운동 가능함을 확인함.':'',clean(c.instruction)]);
 const basis=assessmentBasis(patient,c.assessmentVisitId||visit.id);
 section('참고 평가',basis.flatMap(b=>`${b.sequence}회차 (${b.date}) · ${b.title}: ${b.max===null?b.measures.map(m=>`${m.title} ${Array.isArray(m.value)?m.value.join(', '):m.value}${m.unit}`).join(' / '):[b.answered?`${b.complete?'총점':'미완료 부분 점수'} ${b.total}/${b.max}점 · ${b.answered}항목 평가`:'',b.skipped?`미평가 ${b.skipped}항목`:''].filter(Boolean).join(' · ')}`+(b.computed?.length?'\n'+b.computed.filter(row=>!['미측정','계산 전'].includes(row.value)&&!row.value.startsWith('점수 미확정')&&!/입력하세요|선택해 주세요|조건을 확인하면/.test(row.value)).map(row=>`${row.label}: ${row.value}`).join('\n'):'')));
 const plans=chart.plan.filter(row=>!chart.performed.some(actual=>actual.exerciseId===row.exerciseId));
 section('운동 계획',plans.flatMap((row,i)=>{const ex=exerciseById(row.exerciseId);return [`${i+1}. ${ex.title}`,...[exercisePurpose(ex),doseText(row),clean(row.assistance)?`도움 수준: ${clean(row.assistance)}`:'',clean(row.memo)].filter(Boolean).map(text=>'   '+text)];}));
 section('실제 수행 운동',chart.performed.flatMap((row,i)=>{
  const ex=exerciseById(row.exerciseId);
  const text=row.status==='notdone'?`${ex.title}: 실시하지 않음.`:row.status==='stopped'?`${ex.title}을 시도하였으나 중단함.${clean(row.stopReason)?' 중단 사유: '+clean(row.stopReason):''}`:ex.sentence;
  const details=[row.status==='notdone'?'':doseText(row),clean(row.assistance)?`도움 수준: ${clean(row.assistance)}`:'',clean(row.reaction)?`실제 반응: ${clean(row.reaction)}`:'',clean(row.memo)?`메모: ${clean(row.memo)}`:''].filter(Boolean);
  return [`${i+1}. ${text}`,...(details.length?['   '+details.join(' / ')]:[])];
 }));
 section('운동 미실시 / 제한 사유',[clean(chart.noExerciseReason)]);
 section('실제 반응 · 관찰',[clean(chart.response),chart.afterPain!==''&&chart.afterPain!=null?`종료 후 통증: ${chart.afterPain}/10`:'']);
 section('운동과제 (운동숙제)',[clean(chart.homework??chart.education)]);
 section('다음 방문 계획',[[chart.nextVisitDate,chart.nextVisitTime].filter(Boolean).join(' '),clean(chart.nextPlan)]);
 return {text:lines.join('\n'),issues:[]};
}
export function canReview(patient,visit,chart){const issues=chartIssues(chart);if(!chart.draft.trim())issues.push('먼저 경과기록 초안을 만들어 주세요.');if(chart.draftSource!==noteSource(patient,visit,chart))issues.push('입력이나 참고 평가가 바뀌었습니다. 초안을 다시 생성해 확인해 주세요.');if(!chart.therapist.trim())issues.push('검토할 치료사 성명을 입력해 주세요.');return [...new Set(issues)];}
