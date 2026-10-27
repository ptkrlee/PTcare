import {escape as e,icon} from './icons.js';
export function patientNavigation(patient,{visitId,active='assessments',temporary=false}={}){
 const visit=patient.visits.find(x=>x.id===visitId)||patient.visits.at(-1),base=`/patients/${patient.id}`;
 const links=[['assessments','balance','평가하기',base+(visit?`/visits/${visit.id}/assessments/basic`:'')],...(!temporary?[['plan','sheet','서비스 제공 계획서',base+'/service-plan'],['charting','activity','운동기록지',base+(visit?`/visits/${visit.id}/charting`:'')]]:[])];
 return `<nav class="patient-navigation" aria-label="대상자 관리 분야">${links.map(([key,symbol,label,path])=>`<a class="patient-area ${active===key?'active':''}" data-patient-area="${key}" href="#${path}" aria-current="${active===key?'page':'false'}">${icon(symbol)}<span>${e(label)}</span></a>`).join('')}</nav>`;
}
