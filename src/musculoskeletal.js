import {escape as e} from './icons.js';
const moves=(values)=>values.map(([id,ko,en])=>({id,label:`${ko} (${en})`}));
export const jointGroups=[
 ['neck','목 (Cervical spine)',true,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['lat-l','왼쪽 가쪽굽힘','Left lateral flexion'],['lat-r','오른쪽 가쪽굽힘','Right lateral flexion'],['rot-l','왼쪽 돌림','Left rotation'],['rot-r','오른쪽 돌림','Right rotation']]],
 ['trunk','몸통 (Trunk)',true,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['lat-l','왼쪽 가쪽굽힘','Left lateral flexion'],['lat-r','오른쪽 가쪽굽힘','Right lateral flexion'],['rot-l','왼쪽 돌림','Left rotation'],['rot-r','오른쪽 돌림','Right rotation']]],
 ['shoulder','어깨관절 (Shoulder joint)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['abd','벌림','Abduction'],['add','모음','Adduction'],['ir','안쪽돌림','Internal rotation'],['er','가쪽돌림','External rotation']]],
 ['elbow','팔꿉관절·아래팔 (Elbow / Forearm)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['pro','엎침','Pronation'],['sup','뒤침','Supination']]],
 ['wrist','손목관절 (Wrist joint)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['rad','노쪽굽힘','Radial deviation'],['uln','자쪽굽힘','Ulnar deviation']]],
 ['hand','손가락·엄지 (Fingers / Thumb)',false,[['flex','손가락 굽힘','Finger flexion'],['ext','손가락 폄','Finger extension'],['abd','손가락 벌림','Finger abduction'],['opp','엄지 맞섬','Thumb opposition']]],
 ['hip','엉덩관절 (Hip joint)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension'],['abd','벌림','Abduction'],['add','모음','Adduction'],['ir','안쪽돌림','Internal rotation'],['er','가쪽돌림','External rotation']]],
 ['knee','무릎관절 (Knee joint)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension']]],
 ['ankle','발목관절 (Ankle joint)',false,[['df','발등굽힘','Dorsiflexion'],['pf','발바닥굽힘','Plantarflexion'],['inv','안쪽번짐','Inversion'],['ev','가쪽번짐','Eversion']]],
 ['toes','발가락관절 (Toe joints)',false,[['flex','굽힘','Flexion'],['ext','폄','Extension']]]
].map(([id,label,central,values])=>({id,label,central,movements:moves(values)}));
export const toneGroups=jointGroups.filter(x=>!x.central&&x.id!=='hand'&&x.id!=='toes').map(group=>({...group,movements:group.movements.filter(x=>['flex','ext','df','pf','ir','er'].includes(x.id)).map(move=>({...move,label:move.label.replace(' (','근군 (')+' · 수동 저항'}))}));
export const mmtGrades=['0 (Z)','1 (T)','2− (P−)','2 (P)','2+ (P+)','3− (F−)','3 (F)','3+ (F+)','4− (G−)','4 (G)','4+ (G+)','5 (N)'];
export const masGrades=['0','1','1+','2','3','4'];
const select=(id,label,options)=>({id,label,type:'select',options});
export const clinicalRows=(key)=> (key==='tone'?toneGroups:jointGroups).flatMap(group=>group.movements.map(move=>({group,move,sides:group.central?['center']:['left','right'],id:`${key}-${group.id}-${move.id}`})));
export const clinicalFields=key=>[
 {id:key+'-regions',label:'평가할 부위 (복수 선택)',type:'checks',options:(key==='tone'?toneGroups:jointGroups).map(x=>x.id),optionLabels:Object.fromEntries((key==='tone'?toneGroups:jointGroups).map(x=>[x.id,x.label]))},
 ...(key==='rom'?[select('rom-mode','새로 입력할 검사 방식',['능동 (AROM)','수동 (PROM)'])]:key==='tone'?[select('tone-rest','전반적인 근긴장도 관찰',['보통','저긴장','고긴장','판정 유보'])]:[]),
 ...clinicalRows(key).flatMap(row=>row.sides.flatMap(side=>{const id=row.id+'-'+side,label=row.group.label+' · '+row.move.label+' · '+({left:'왼쪽',right:'오른쪽',center:'공통'}[side]);return key==='rom'?[select(id,label,['Full','Limited']),{id:id+'-degrees',label:label+' 실제 각도',type:'number',min:-180,max:360,step:0.1,unit:'°'}]:[select(id,label,key==='mmt'?mmtGrades:masGrades)];}))
];
export const musculoskeletalAssessments=Object.fromEntries([
 ['rom','ROM','관절가동범위','Range of Motion','Full / Limited · 제한 각도 선택 입력','관절과 방향을 선택해 평가합니다. Full은 해당 관절의 가용 범위에 제한이 없다는 검사자 기록이며 정상 각도를 임의 생성하지 않습니다. Limited의 실제 각도는 선택 입력입니다. 엄지 맞섬은 각도 대신 메모로 위치를 기록할 수 있습니다.'],
 ['mmt','MMT','맨손근력검사','Manual Muscle Testing','좌·우 등급 · F− / F / F+ 포함','검사 자세·중력 제거 여부·저항을 확인해 등급을 기록합니다. 0(Z)=수축 없음, 1(T)=수축 확인, 2(P)=중력 제거 전 범위, 3(F)=중력에 대항한 전 범위, 4(G)=저항에 대항, 5(N)=정상 근력. +/−의 세부 저항·부분 범위 기준은 기관 기준표를 확인해 사용하며 힘의 수치로 환산하지 않습니다.'],
 ['tone','MAS','근긴장도 검사','Modified Ashworth Scale','좌·우 MAS · 0 / 1 / 1+ / 2 / 3 / 4','수동 움직임에 대한 저항을 MAS로 기록합니다. 0=저항 증가 없음, 1=끝 범위의 걸림 또는 약한 저항, 1+=걸림 후 절반 미만 범위에서 약한 저항, 2=대부분 범위에서 저항 증가하나 쉽게 움직임, 3=수동 움직임 어려움, 4=굽힘/폄 자세에서 경직. 저긴장과 구축을 MAS 점수로 대체하지 않습니다.']
].map(([key,code,title,english,unit,instruction])=>[key,{code,title,english,short:title,max:null,unit,instruction,items:[],fields:clinicalFields(key),clinicalKey:key,musculoskeletal:true,source:key==='tone'?'Modified Ashworth Scale · Bohannon & Smith (1987), doi:10.1093/ptj/67.2.206':key==='rom'?'첨부 협회 활동평가지 ROM 기반 · 선택 부위 기록':'첨부 협회 활동평가지 MMT 기반 · +/− 세부 기준표 보완 필요'}]));
export function selectedClinicalRows(a,f){const regions=f.fields?.[a.clinicalKey+'-regions']||[];return clinicalRows(a.clinicalKey).filter(row=>regions.includes(row.group.id));}
export function clinicalComplete(a,f){const rows=selectedClinicalRows(a,f),fields=f.fields||{};return rows.length>0&&rows.every(row=>row.sides.every(side=>{const id=row.id+'-'+side,spec=a.fields.find(x=>x.id===id);return spec.options.includes(fields[id]);}));}
export function renderClinical(a,f,renderField){
 const key=a.clinicalKey,rows=selectedClinicalRows(a,f);
 const sideLabel=side=>side==='center'?'공통 (중앙)':side==='right'?'환자 오른쪽 (R)':'환자 왼쪽 (L)';
 const sideField=(row,side)=>{
  const id=row.id+'-'+side,spec=a.fields.find(x=>x.id===id);
  return `<div class="clinical-side clinical-side-${side}" data-patient-side="${side}"><h5>${sideLabel(side)}</h5>${renderField({...spec,label:key==='rom'?sideLabel(side)+' 가동범위':key==='mmt'?'근력 등급':'MAS 등급'},f.fields[id])}${key==='rom'?`<div data-rom-angle="${id}" ${f.fields[id]==='Limited'?'':'hidden'}>${renderField({...a.fields.find(x=>x.id===id+'-degrees'),label:'각도 · 선택 입력'},f.fields[id+'-degrees'])}</div>`:''}</div>`;
 };
 return `<div class="clinical-layout ${key==='rom'?'rom-layout':''}"><section class="clinical-scope identity-card"><h3>검사 범위와 공통 항목</h3>${a.fields.filter(x=>x.id===key+'-regions'||x.id==='rom-mode'||x.id==='tone-rest').map(x=>renderField(x,f.fields[x.id])).join('')}</section>${rows.length?`<p class="clinical-orientation">대상자와 마주본 기준 · 화면 왼편은 <strong>환자 오른쪽(R)</strong>, 오른편은 <strong>환자 왼쪽(L)</strong>입니다.</p>`+([...new Set(rows.map(x=>x.group.id))].map(groupId=>{
  const group=rows.find(x=>x.group.id===groupId).group;
  return `<details class="joint-group" open><summary>${e(group.label)}</summary>${rows.filter(x=>x.group.id===groupId).map(row=>`<section class="clinical-movement" data-clinical-movement="${row.id}"><h4>${e(row.move.label)}</h4><div class="clinical-sides ${row.group.central?'clinical-sides-central':''}">${(row.group.central?['center']:['right','left']).map(side=>sideField(row,side)).join('')}</div></section>`).join('')}</details>`;
 }).join('')):'<p class="empty-state">위에서 평가할 관절·부위를 먼저 선택하세요. 미평가 부위는 정상으로 처리하지 않습니다.</p>'}</div>`;
}
export function clinicalResultTable(a,f){const key=a.clinicalKey,fields=f.fields||{},regions=fields[key+'-regions']||[],rows=clinicalRows(key).filter(row=>regions.includes(row.group.id)||row.sides.some(side=>fields[row.id+'-'+side]));const value=(row,side)=>{const id=row.id+'-'+side,raw=fields[id];if(!raw)return '미선택';if(raw==='skipped')return '미평가';let result=raw;if(key==='rom'){if(raw==='Limited'&&fields[id+'-degrees']!==''&&fields[id+'-degrees']!==undefined)result+=' '+fields[id+'-degrees']+'°';const method=fields[id+'-method'];if(method)result+=' · '+method;}return result;};return `<table class="result-table clinical-result-table"><colgroup><col class="clinical-col-region"><col class="clinical-col-side"><col class="clinical-col-movement"><col class="clinical-col-side"></colgroup><thead><tr><th>부위 / 관절</th><th>환자 오른쪽 (R)</th><th>움직임 / 근군</th><th>환자 왼쪽 (L)</th></tr></thead><tbody>${rows.map((row,index)=>`<tr>${index===0||rows[index-1].group.id!==row.group.id?`<th rowspan="${rows.filter(x=>x.group.id===row.group.id).length}">${e(row.group.label)}</th>`:''}${row.group.central?`<td colspan="3" class="clinical-central-result"><strong>${e(row.move.label)}</strong> · 공통: ${e(value(row,'center'))}</td>`:`<td data-patient-side="right">${e(value(row,'right'))}</td><th>${e(row.move.label)}</th><td data-patient-side="left">${e(value(row,'left'))}</td>`}</tr>`).join('')}</tbody></table>`;}
