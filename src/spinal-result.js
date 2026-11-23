import {escape as e} from './icons.js';
import {computedMeasurements,measurementValueValid} from './extra-assessments.js';
import {spinalCoverFields,spinalSurveySections} from './spinal-surveys.js';
import {cervicalMeasurements,thoracolumbarMeasurements,headPostureMeasurements} from './spinal-measurements.js';
import {safePhoto} from './charting/service-record.js';

export function spinalResultSections(assessment,form,patient){
 const fields=form.fields||{};
 const byId=new Map(assessment.fields.map(field=>[field.id,field]));
 const scores=new Map(computedMeasurements('spinal-asymmetry',fields).map(row=>[row.key,row]));
 const valueOf=field=>{
  const raw=fields[field.id];
  if(raw==='skipped')return '미평가';
  if(raw==null||raw==='')return '';
  if(!measurementValueValid(field,raw))return '입력 확인 필요';
  return [raw,field.unit].filter(part=>part!=null&&part!=='').join(' ');
 };
 const section=(title,body,style='')=>`<section class="spinal-result-section ${style}"><h2>${e(title)}</h2><div class="spinal-result-content">${body}</div></section>`;
 const definitions=rows=>rows.length?`<dl class="spinal-result-values">${rows.map(([label,value])=>
  `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`:'<p>입력된 기록 없음</p>';
 const basicFields=[['성별',patient.identity.sex],...spinalCoverFields.map(field=>[field.label,valueOf(field)])];
 const [pain,neck,back]=spinalSurveySections;
 const neckAnswers=neck.fields.map(field=>[field.label.replace(/^NDI · /,''),field.options.indexOf(fields[field.id])]);
 const neckAnswered=neckAnswers.filter(([,score])=>score>=0);
 const neckTotal=scores.get('ndi');
 const neckTitle=neckTotal?'총점 '+neckTotal.value:(neckAnswered.length
  ?`부분 점수 ${neckAnswered.reduce((sum,[,score])=>sum+score,0)}점 · ${neckAnswered.length}/10 응답`
  :'미평가');
 const neckItems=neckAnswered.filter(([,score])=>score>0).map(([label,score])=>[label,score+'점']);
 const [backItems]=back.fields;
 const chosen=fields[backItems.id];
 const selected=Array.isArray(chosen)?backItems.options.filter(option=>chosen.includes(option)):[];
 const backTotal=scores.get('rmdq');
 const backTitle=backTotal?'총점 '+backTotal.value:selected.length?`확인 전 · ${selected.length}문항 선택`:'미평가';
 const survey=(title,total,items)=>section(title,`<p class="spinal-result-score">${e(total)}</p>${items}`,'spinal-result-survey');
 const grid=(title,columns,average=false)=>`<div class="spinal-result-group"><h3>${e(title)}</h3><div class="spinal-result-grid" style="--slots:${columns.length+Number(average)}">
  ${columns.map(([id,label])=>{
   const field=byId.get(id),direction=byId.get(id+'-direction');
   const source=safePhoto(form.measurementPhotos?.[id]?.data);
   return `<div class="spinal-result-reading"><h4>${e(label)}</h4>
    ${direction?`<span class="spinal-result-direction" aria-label="기울기 방향">${e(valueOf(direction)||'방향 미입력')}</span>`:''}
    <strong>${e(valueOf(field)||'미입력')}</strong>
    ${source?`<button type="button" class="spinal-result-photo" data-spinal-result-photo aria-label="${e(field.label)} 사진 크게 보기"><img src="${source}" alt="${e(field.label)} 사진"></button>`:''}
   </div>`;
  }).join('')}
  ${average?`<div class="spinal-result-reading"><h4>평균</h4><strong>${e(scores.get('cv')?.value||'계산 전')}</strong></div>`:''}
 </div></div>`;
 return section('기본 정보',definitions(basicFields.filter(([,value])=>value)))
  +section(pain.title,definitions(pain.fields.map(field=>[field.label,valueOf(field)]).filter(([,value])=>value)))
  +`<div class="spinal-result-surveys">${survey(neck.title,neckTitle,neckItems.length?definitions(neckItems):'')}
  ${survey(back.title,backTitle,selected.length?`<ul class="spinal-result-checks">${selected.map(option=>`<li>${e(option)}</li>`).join('')}</ul>`:'')}</div>`
  +section('척추 이마면 비대칭 (SCA)',grid('목뼈 (CCA)',cervicalMeasurements)+grid('등허리뼈 (TCA)',thoracolumbarMeasurements))
  +section('앞쪽머리자세 (FHP)',grid('걷는 중 측정',headPostureMeasurements,true));
}

export function bindSpinalResultPhotos(root,modal){
 root.querySelectorAll('[data-spinal-result-photo]').forEach(button=>button.onclick=()=>{
  const img=button.querySelector('img');
  const source=safePhoto(img.getAttribute('src'));
  if(!source)return;
  modal(`<h2>${e(img.alt)}</h2><img src="${source}" alt="${e(img.alt)}" class="spinal-photo-preview"><div class="dialog-actions"><button type="button" class="button primary" data-close>닫기</button></div>`);
 });
}
