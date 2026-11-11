import {assessmentClosed} from './assessment-closure.js';
import {assessmentOrder,getAssessment} from './data.js';
import {formFor} from './records.js';
// Read persisted responses, never synthesize history from defaults, dates or a visited page.
const setup=new Set(['tug-distance','tug-pace','tug-assistance','tug-population','tug-cognitive-task','tug-cognitive-protocol','tug-manual-protocol','tug-aid','tug-nmd-confirm','tug-study-reference','sppb-distance','grip-sex','grip-guideline','grip-protocol','grip-dominant','sts-arms','sts-minute-population','sts-minute-protocol','sts-five-endpoint','sts-five-match','sts-five-population','sts-five-arms','body-calf-protocol','body-calf-caution','asm-guideline','asm-applicability','asm-adjustment','asm-sex','asm-reference','asm-method','asm-gait-distance','asm-gait-protocol','asm-gait-start','asm-date-review','asm-report-date']);
const entered=value=>Array.isArray(value)?value.some(entered):typeof value==='number'?Number.isFinite(value):typeof value==='string'&&!!value.trim()&&!['skipped','미실시','미입력','미선택'].includes(value);
export function hasAssessmentRecord(visit,key){
 const raw=visit.forms?.[key],legacy=key==='sts'?visit.forms?.sarcopenia?.fields?.['asm-chair-5']:undefined;
 if(!raw&&!entered(legacy))return false;
 const a=getAssessment(key,raw?.mobility);if(!a)return false;
 const f=formFor(visit,key);
 if(assessmentClosed(f))return true;
 if(a.items.some(item=>typeof f.answers?.[item.id]==='number'&&Number.isFinite(f.answers[item.id])))return true;
 if(entered(f.note)||entered(f.comment))return true;
 if(Object.values(f.drawings||{}).some(strokes=>Array.isArray(strokes)&&strokes.some(stroke=>Array.isArray(stroke)&&stroke.length)))return true;
 const fields=f.fields||{},specs=new Set((a.fields||[]).map(field=>field.id));
 return Object.entries(fields).some(([id,value])=>{
  if(setup.has(id)||/-(regions|education|examiner)$/.test(id)||id==='rom-mode')return false;
  if(id.endsWith('-criterion'))return value==='passed';
  if(/^bbs-\d+-seconds(?:-right|-left)?$/.test(id))return entered(value);
  return specs.has(id)&&entered(value);
 });
}
export const recordedAssessmentKeys=visit=>assessmentOrder.filter(key=>hasAssessmentRecord(visit,key));
export const assessmentHistory=patient=>(patient.visits||[]).flatMap(visit=>{const keys=recordedAssessmentKeys(visit);return keys.length?[{visit,keys}]:[];}).reverse();
export function latestAssessmentDate(patient){return assessmentHistory(patient).map(({visit})=>visit.date).filter(Boolean).sort().at(-1)||'';}
