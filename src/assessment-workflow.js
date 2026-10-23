import {measurementValueValid} from './extra-assessments.js';
import {criterionState,bbsTimeValid} from './timed-criteria.js';
const keyFor=a=>({'MoCA-K':'moca-k','K-MoCA':'moca-k2','GRIP':'grip','STS':'sts','OLS':'one-leg','TUG':'tug','BODY':'circumference','ASM':'sarcopenia'})[a.code];
export function workflowProgress(a,f,s){
 const fields=f.fields||{},key=keyFor(a);
 const valid=id=>{const spec=a.fields?.find(x=>x.id===id),criterion=criterionState(id,fields);return criterion.active?criterion.valid:!!spec&&measurementValueValid(spec,fields[id]);};
 let complete=s.complete;
 if(a.max===null){
  let required=[];
  if(key==='grip')required=['grip-sex','grip-dominant',...['right','left'].flatMap(side=>[1,2,3].map(n=>`grip-${side}-${n}`))];
  if(key==='sts')required=['sts-count','sts-arms','sts-single-right','sts-single-left','sts-five-time'];
  if(key==='one-leg')required=a.fields.map(x=>x.id);
  if(key==='tug')required=['tug-distance','tug-pace','tug-assistance','tug-population','tug-original'];
  if(key==='circumference')required=a.fields.map(x=>x.id);
  if(key==='sarcopenia')required=['asm-method'];
  complete=required.length>0&&required.every(valid);
  if(key==='sts')complete=complete&&fields['sts-arms']!=='미실시'&&!['미실시','skipped'].includes(fields['sts-single-right'])&&!['미실시','skipped'].includes(fields['sts-single-left']);
  if(key==='sarcopenia')complete=complete&&(valid('asm-index')||(valid('asm-mass')&&valid('asm-height')&&Number(fields['asm-height'])>0));
  // Dual tasks are optional, but a started task must have its duration and protocol.
  if(key==='tug')for(const [id,protocol] of [['tug-cognitive','tug-cognitive-protocol'],['tug-manual','tug-manual-protocol']])if(fields[id]||fields[protocol])complete=complete&&valid(id)&&valid(protocol);
 }
 if(a.code==='BBS')complete=complete&&a.items.every(item=>bbsTimeValid(item,f));
 // Invalid entered numbers cannot be reported as a finished evaluation.
 if((a.fields||[]).some(spec=>spec.type==='number'&&fields[spec.id]!==undefined&&fields[spec.id]!==''&&fields[spec.id]!=='skipped'&&!valid(spec.id)))complete=false;
 const measured=(a.fields||[]).filter(x=>valid(x.id)).length;
 const date=complete?(f.completedAt||f.updatedAt||''):'';
 return {...s,complete,measured,completedAt:date};
}
export function stampCompletion(form,complete,now=new Date().toISOString()){
 if(complete){form.completedAt||=now;}else delete form.completedAt;
}
export function completionDate(iso){if(!iso)return '';const d=new Date(iso);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';}
