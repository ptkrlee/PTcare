import {assessmentOrder} from './data.js';
import {formFor} from './records.js';
import {syncServicePlan} from './service-plan.js';
const visitFor=(patient,id)=>patient.visits?.find(visit=>visit.id===id);
export function assessmentDeleteSource(patient,visitId,key){
 const v=visitFor(patient,visitId);return JSON.stringify({form:v?.forms?.[key]??null,...(['sts','sarcopenia'].includes(key)?{sts:v?.forms?.sts??null,legacy:v?.forms?.sarcopenia?.fields?.['asm-chair-5']??null}: {})});
}
export function deleteAssessment(patient,visitId,key,expectedSource,now=new Date().toISOString()){
 if(!assessmentOrder.includes(key))throw new Error('삭제할 평가를 확인해 주세요.');
 const visit=visitFor(patient,visitId);if(!visit)throw new Error('해당 회차를 찾을 수 없습니다.');
 if(assessmentDeleteSource(patient,visitId,key)!==expectedSource)throw new Error('확인 창을 연 뒤 평가가 변경되었습니다. 최신 기록을 확인한 후 다시 삭제해 주세요.');
 // The old ASM chair-time field belongs to STS. Preserve it when deleting ASM,
 // and remove that fallback when deleting STS so deleted data cannot reappear.
 const legacy=visit.forms?.sarcopenia?.fields?.['asm-chair-5'];
 if(key==='sarcopenia'&&legacy!==undefined&&visit.forms?.sts?.fields?.['sts-five-time']===undefined){
  const prior=visit.forms.sts;
  visit.forms.sts=structuredClone(formFor(visit,'sts'));
  visit.forms.sts.updatedAt=prior?.updatedAt||visit.forms.sarcopenia.updatedAt||visit.updatedAt;
 }
 if(key==='sts'&&legacy!==undefined)delete visit.forms.sarcopenia.fields['asm-chair-5'];
 if(visit.forms)delete visit.forms[key];
 visit.updatedAt=now;syncServicePlan(patient,now);
}
