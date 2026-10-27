import {getAssessment,summarize} from './data.js';
import {formFor} from './records.js';
import {workflowProgress} from './assessment-workflow.js';
import {measurementValueValid} from './extra-assessments.js';
import {basicSummaryRows,basicSafety,sgdsInterpretation,nrsValid} from './basic-assessment.js';
import {sarcopeniaAssessment} from './sarcopenia-criteria.js';
import {clinicalRows} from './musculoskeletal.js';
export const defaultSessions=[
 ['동의·안전·초기평가','생활 목표 / 필요한 평가 / 안전한 기본과제','평가 조건·도움·반응'],
 ['기본 움직임·보호자 교육','기본 가동성·근력 / 보호자 교육','1·2회기 연속 시행 시 피로 확인'],
 ['기초 근력·관절 움직임','어깨·무릎·허리 등 평가에 따른 맞춤 운동','통증·횟수·자세'],
 ['기립·이동·균형','앉았다 일어서기 / 체중 이동 / 방향 전환','지지·보조기구·안전'],
 ['생활 동선 적용','침상·의자·화장실·실내 보행 등 실제 생활 동선','실제 장소·거리·도움'],
 ['진행 또는 감량','반복·방법·속도·휴식 조정','조정 이유·대상자 반응'],
 ['기능과제·종결 준비','초기와 같은 조건의 예행연습','재평가 조건 확정'],
 ['종결 재평가·자기관리','초기 평가와 비교 / 운동과제 / 필요한 상담·연계','변화 비교·생활 목표·자기관리']
].map(([goal,activities,check],i)=>({session:i+1,minutes:40,goal,activities,check}));
const entered=f=>Object.values(f.answers||{}).some(x=>x!==''&&x!==undefined)||Object.values(f.fields||{}).some(x=>Array.isArray(x)?x.length>0:x!==''&&x!==undefined)||!!f.note||!!f.comment;
export function latestAssessments(patient){
 const latest=new Map();
 for(const visit of patient.visits||[])for(const [key,raw] of Object.entries(visit.forms||{})){
  const a=getAssessment(key,raw.mobility);if(!a||!entered(raw))continue;
  const f=formFor(visit,key),stamp=f.updatedAt||visit.updatedAt||visit.createdAt||visit.date+'T00:00:00Z',prior=latest.get(key);
  if(prior&&prior.updatedAt>stamp)continue;
  latest.set(key,{key,a,f,visitId:visit.id,sequence:visit.sequence,date:visit.date,visit,updatedAt:stamp});
 }
 return [...latest.values()].sort((a,b)=>a.key.localeCompare(b.key));
}
function describe(source){const {a,f,key}=source,s=workflowProgress(a,f,summarize(a,f.answers,f.fields));let text;
 if(a.basic)text=basicSummaryRows(f.fields).map(x=>x.label+': '+x.value).join(' / ');
 else if(a.sgds)text=`${s.complete?'총점':'부분 점수'} ${s.total}/15점 · ${s.answered}/15문항 · ${sgdsInterpretation(s)}`;
 else if(a.musculoskeletal){const entries=clinicalRows(a.clinicalKey).flatMap(row=>row.sides.map(side=>{const id=row.id+'-'+side,raw=f.fields[id];return raw===undefined||raw===''?null:`${row.group.label} ${row.move.label} ${side==='left'?'좌':side==='right'?'우':'공통'}: ${raw==='skipped'?'미평가':raw}${raw==='Limited'&&f.fields[id+'-degrees']!==undefined&&f.fields[id+'-degrees']!==''?' '+f.fields[id+'-degrees']+'°':''}`;})).filter(Boolean);text=entries.join(' / ');}
 else if(a.max!==null)text=`${s.complete?'총점':'미완료 부분 점수'} ${s.total}/${a.max}점 · ${s.answered}/${a.items.length}문항${s.skipped?' · 미평가 '+s.skipped+'문항':''}`;
 else text=(a.fields||[]).filter(field=>measurementValueValid(field,f.fields[field.id])).map(field=>`${field.label}: ${Array.isArray(f.fields[field.id])?f.fields[field.id].join(', '):f.fields[field.id]}${field.unit?' '+field.unit:''}`).join(' / ');
 let shortText=text;const painText=id=>nrsValid(f.fields[id])?String(f.fields[id]):'미평가';
 if(a.basic)shortText=['현재 '+painText('basic-pain-current'),'휴식 시 '+painText('basic-pain-rest'),'활동 시 '+painText('basic-pain-activity'),(f.fields['basic-pain-patterns']||[]).includes('야간 통증')?'야간 '+painText('basic-pain-night'):'야간통 미선택'].join(' / ')+' (각 NRS 0–10) · '+(Array.isArray(f.fields['basic-diagnoses'])?f.fields['basic-diagnoses']:[]).join(', ')+' · 통증 부위: '+(Array.isArray(f.fields['basic-pain-sites'])?f.fields['basic-pain-sites'].join(', '):'미기록')+(f.fields['basic-pain-site-other']?' '+f.fields['basic-pain-site-other']:'')+' · 일상생활 영향: '+(f.fields['basic-pain-impact']||'미기록')+' · 최근 낙상: '+(f.fields['basic-falls']||'미기록');
 if(a.musculoskeletal){const counts=new Map();for(const field of a.fields){if(field.type!=='select'||!['left','right','center'].some(side=>field.id.endsWith('-'+side)))continue;const value=f.fields[field.id];if(value!==undefined&&value!==''&&value!=='skipped')counts.set(value,(counts.get(value)||0)+1);}shortText=[...counts].map(([value,count])=>value+' '+count+'항목').join(' · ')||'선택된 결과 없음';const details=clinicalRows(a.clinicalKey).flatMap(row=>row.sides.map(side=>{const id=row.id+'-'+side,raw=f.fields[id];if(raw===undefined||raw===''||raw==='skipped'||a.clinicalKey==='rom'&&raw!=='Limited')return null;return row.group.label+' '+row.move.label+' '+(side==='left'?'좌':side==='right'?'우':'공통')+' '+raw+(raw==='Limited'&&f.fields[id+'-degrees']!==undefined&&f.fields[id+'-degrees']!==''?' '+f.fields[id+'-degrees']+'°':'');})).filter(Boolean);if(details.length)shortText+=' · '+details.slice(0,3).join(' / ')+(details.length>3?' · 나머지 '+(details.length-3)+'항목은 상세 평가지 참조':'');}
 if(a.max===null&&!a.basic&&!a.musculoskeletal)shortText=text.length>280?text.slice(0,280)+' · 상세 평가지 참조':text;
 if(key==='sarcopenia'){const integrated=sarcopeniaAssessment(f.fields,{visit:source.visit});if(integrated){text+=' / '+integrated.rows.map(x=>x.label+': '+x.value).join(' / ');shortText=integrated.guideline+' · '+integrated.conclusion+' / '+integrated.rows.find(x=>x.label==='근육량 대조').value;}}
 return {key,title:a.title,shortText,sequence:source.sequence,date:source.date,updatedAt:source.updatedAt,complete:s.complete,total:a.max===null?null:s.total,answered:s.answered,text};
}
export function servicePlanInput(patient){const sources=latestAssessments(patient);return JSON.stringify({identity:patient.identity,sources:sources.map(x=>({key:x.key,date:x.date,visitId:x.visitId,updatedAt:x.updatedAt,answers:x.f.answers,fields:x.f.fields,mobility:x.f.mobility,note:x.f.note})),config:patient.servicePlan?.config||{}});}
export function deriveServicePlan(patient,reflectedAt=new Date().toISOString()){
 const sources=latestAssessments(patient),summary=sources.map(describe),config=patient.servicePlan?.config||{},basic=sources.find(x=>x.key==='basic'),mood=sources.find(x=>x.key==='sgds');
 const risks=basic?basicSafety(basic.f.fields):[],focus=[];
 if(basic&&['basic-pain-current','basic-pain-rest','basic-pain-activity','basic-pain-night'].some(id=>{const v=basic.f.fields[id];return v!==''&&v!==undefined&&v!=='skipped'&&Number(v)>0&&(id!=='basic-pain-night'||(basic.f.fields['basic-pain-patterns']||[]).includes('야간 통증'));}))focus.push('기록된 통증 부위·유발 상황을 확인하고 운동 범위·강도·휴식을 개별 조절');
 if(basic&&['1회','2회 이상'].includes(basic.f.fields['basic-falls']))focus.push('최근 낙상 장소·상황과 보조기·보행 환경을 확인해 안전한 생활 동선을 검토');
 if(sources.some(x=>x.key==='rom'&&Object.values(x.f.fields).includes('Limited')))focus.push('관절가동범위 제한 부위와 통증 범위를 확인해 가동성 과제를 검토');
 if(sources.some(x=>x.key==='mmt'))focus.push('부위별 MMT 등급을 바탕으로 중력·저항·도움을 치료사가 설정');
 if(sources.some(x=>['bbs','sppb','tug','one-leg'].includes(x.key)))focus.push('균형·이동 평가의 실제 수행 조건에 맞춰 안전한 지지와 보행 과제를 검토');
 if(sources.some(x=>x.key==='mbi'))focus.push('일상생활동작 평가에서 기록한 도움이 필요한 과제를 생활 목표에 연결');
 if(mood){const s=summarize(mood.a,mood.f.answers,mood.f.fields);if(s.complete&&s.total>=5)focus.push(s.total>=10?'정서 선별 결과에 따라 전문 의료진 상담·평가 연계를 권고':'정서 상태 추가 확인과 상담을 권고');}
 return {version:1,basisSignature:servicePlanInput(patient),reflectedAt,latestAssessmentUpdatedAt:summary.map(x=>x.updatedAt).sort().at(-1)||null,sources:summary,focus,risks,config:{therapist:config.therapist||'',periodStart:config.periodStart||'',periodEnd:config.periodEnd||'',lifeGoal:config.lifeGoal||'',strengths:config.strengths||'',limitations:config.limitations||'',priorityAreas:config.priorityAreas||[]},sessions:(config.sessions||defaultSessions).map(x=>({...x})),status:'draft'};
}
export function syncServicePlan(patient,now=new Date().toISOString()){
 const signature=servicePlanInput(patient);if(patient.servicePlan?.current?.basisSignature===signature)return false;
 patient.servicePlan||={config:{},history:[]};patient.servicePlan.current=deriveServicePlan(patient,now);return true;
}
