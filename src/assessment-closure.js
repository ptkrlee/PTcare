import {measurementValueValid} from './extra-assessments.js';
import {selectedClinicalRows} from './musculoskeletal.js';
import {bbsTimeValid,criterionState} from './timed-criteria.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
// Change detection only, not a signature or an authorization mechanism. Avoid duplicating drawing vectors.
export function closureSource(f){
 const text=JSON.stringify(canonical(Object.fromEntries(['answers','fields','drawings','drawingModes','drawingSizes','mobility','note','comment'].map(key=>[key,f[key]??null]))));
 let a=2166136261,b=5381;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b,33)^code;}return text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
export const assessmentClosed=f=>!!f.closure?.at&&!!f.closure?.by&&f.closure.source===closureSource(f);
export function closureReminder(a,f,s){
 if(s.complete)return [];
 const fields=f.fields||{},missing=[],label=id=>a.fields?.find(field=>field.id===id)?.label||id;
 const valid=id=>{const rule=criterionState(id,fields),spec=a.fields?.find(field=>field.id===id);return rule.active?rule.valid:!!spec&&measurementValueValid(spec,fields[id]);};
 for(const row of s.selected||[])if(!row.option)missing.push(row.item.title);
 if(a.code==='BBS')for(const item of a.items)if(!bbsTimeValid(item,f))missing.push(item.title+' · 실제 수행 시간/시간 조건');
 if(a.code==='MoCA-K'&&!s.educationKnown)missing.push('교육연수');
 let required=[];
 if(a.code==='GRIP')required=['grip-sex','grip-dominant',...['right','left'].flatMap(side=>[1,2,3].map(n=>`grip-${side}-${n}`))];
 if(a.code==='STS'){required=['sts-count','sts-arms','sts-single-right','sts-single-left','sts-five-time'];for(const id of ['sts-arms','sts-single-right','sts-single-left'])if(fields[id]==='미실시')missing.push(label(id)+' · 미실시');}
 if(a.code==='OLS')required=a.fields.map(field=>field.id);
 if(a.code==='TUG'){required=['tug-distance','tug-pace','tug-assistance','tug-population','tug-original'];for(const [id,protocol] of [['tug-cognitive','tug-cognitive-protocol'],['tug-manual','tug-manual-protocol']])if(fields[id]||fields[protocol])required.push(id,protocol);}
 if(a.code==='BODY')required=a.fields.filter(field=>!['body-calf-protocol','body-calf-caution'].includes(field.id)).map(field=>field.id);
 if(a.code==='ASM'){required=['asm-method'];if(!(valid('asm-index')||(valid('asm-mass')&&valid('asm-height')&&Number(fields['asm-height'])>0)))missing.push('ASM 지수 또는 사지골격근량·키');}
 if(a.basic){required=['basic-falls','basic-neuro','basic-vitals','basic-pain-impact','basic-before-pain','basic-pain-current','basic-pain-rest','basic-pain-activity'];if((fields['basic-pain-patterns']||[]).includes('야간 통증'))required.push('basic-pain-night');const symptoms=fields['basic-symptoms'];if(!Array.isArray(symptoms)||!symptoms.length||(symptoms.includes('없음')&&symptoms.length>1))missing.push(label('basic-symptoms'));const confirmations=fields['basic-confirmations']||[];for(const option of a.fields.find(field=>field.id==='basic-confirmations').options)if(!confirmations.includes(option))missing.push('평가 전 확인 · '+option);}
 if(a.musculoskeletal){const rows=selectedClinicalRows(a,f);if(!rows.length)missing.push('검사할 부위 선택');required=rows.flatMap(row=>row.sides.map(side=>row.id+'-'+side));}
 for(const id of required)if(!valid(id))missing.push(label(id));
 for(const field of a.fields||[]){const value=fields[field.id];if(field.type!=='number'||value==null||value===''||value==='skipped')continue;if(a.basic&&field.id==='basic-pain-night'&&!(fields['basic-pain-patterns']||[]).includes('야간 통증'))continue;if(a.clinicalKey==='rom'&&field.id.endsWith('-degrees')&&fields[field.id.slice(0,-8)]!=='Limited')continue;if(!valid(field.id))missing.push(field.label+' · 입력값 확인');}
 return [...new Set(missing.length?missing:['평가 시행 조건 또는 필수 측정값 확인'])];
}
