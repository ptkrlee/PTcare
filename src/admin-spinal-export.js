import {getAssessment,summarize} from './data.js';
import {computedMeasurements,measurementValueValid} from './extra-assessments.js';
import {workflowProgress} from './assessment-workflow.js';

const assessmentKey='spinal-asymmetry';
const assessment=getAssessment(assessmentKey);
// Export structured responses and the two explicitly named identity fields.
const fields=assessment.fields.filter(field=>field.type!=='text');
const columns=[
 ['치료사 이름','해당 회차의 척추비대칭평가에서 검사자 칸에 입력한 이름. 비어 있으면 공란.'],
 ['대상자 이름','대상자 기본 정보에 입력한 이름.'],
 ['회차','대상자의 방문 회차 번호'],
 ['평가 상태','완료, 치료사 종료(부분), 작성 중'],
];
for(const field of fields){
 if(field.type==='checks'){
  field.options.forEach((option,index)=>columns.push([
   'RMDQ '+(index+1),option+' 1=해당, 0=해당 없음. 확인 전 미선택은 공란.',
  ]));
 }else{
  const label=field.label+(field.unit?' ('+field.unit+')':'');
  const help=field.id.startsWith('sca-ndi-')?field.options.join(' / '):'미입력·미평가·유효 범위 밖의 값은 공란.';
  columns.push([label,help]);
 }
}
columns.push(
 ['NDI 총점 (0–50)','10개 응답을 모두 입력했을 때만 계산'],
 ['RMDQ 총점 (0–24)','모든 문항을 확인했다고 표시한 경우에만 계산'],
 ['CV 평균 (°)','15·20·25초 각도를 모두 입력했을 때만 계산'],
);

function assessmentValues(fieldsById,scores){
 return fields.flatMap(field=>{
  const value=fieldsById[field.id];
  const valid=measurementValueValid(field,value);
  if(field.type==='checks'){
   return field.options.map(option=>valid&&value.includes(option)?1:scores.has('rmdq')?0:null);
  }
  if(!valid)return [null];
  if(field.type==='number')return [Number(value)];
  if(field.id.startsWith('sca-ndi-'))return [field.options.indexOf(value)];
  return [value];
 });
}

export async function collectSpinalExport(rpc,{active,progress}){
 const members=(await rpc('admin_therapists')).filter(member=>
  (member.member_type||'therapist')==='therapist'&&Number(member.patient_count)>0);
 const results=[];
 for(const [index,member] of members.entries()){
  if(!active())return null;
  progress(index+1,members.length);
  const patients=await rpc('admin_patient_records',{p_owner_id:member.user_id});
  for(const {document} of patients){
   for(const visit of document.visits||[]){
    const form=visit.forms?.[assessmentKey];
    if(!form)continue;
    const answers=form.fields||{};
    const scores=new Map(computedMeasurements(assessmentKey,answers).map(row=>[row.key,row.numeric]));
    const values=assessmentValues(answers,scores);
    if(values.every(value=>value===null))continue;
    const state=workflowProgress(assessment,form,summarize(assessment,form.answers,answers));
    const status=state.complete?'완료':state.closed?'치료사 종료(부분)':'작성 중';
    const examiner=answers['sca-cover-examiner'];
    const patientName=document.identity?.name;
    results.push([
     typeof examiner==='string'?examiner:null,
     typeof patientName==='string'?patientName:null,
     visit.sequence,status,...values,...['ndi','rmdq','cv'].map(key=>scores.get(key)??null),
    ]);
   }
  }
 }
 return results;
}

export async function downloadSpinalWorkbook(results,active){
 const {default:writeExcelFile}=await import('write-excel-file/browser');
 if(!active())return;
 const header=labels=>labels.map(value=>({value,fontWeight:'bold',backgroundColor:'#E4F1EB'}));
 await writeExcelFile([
  {sheet:'회차별 평가 결과',data:[header(columns.map(([label])=>label)),...results]},
  {sheet:'변수 설명',data:[header(['열 이름','설명']),...columns]},
 ]).toFile('PTcare-척추비대칭평가.xlsx');
}
