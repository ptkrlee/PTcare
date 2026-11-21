import {renderSpinalPhoto} from './spinal-photos.js';
import {escape as e} from './icons.js';
import {spinalCoverFields,spinalSurveySections} from './spinal-surveys.js';

const painPositions={
 neck:[432,63],waist:[440,205],
 'shoulder-right':[94,119],'shoulder-left':[429,119],
 'elbow-right':[62,191],'elbow-left':[433,183],
 'wrist-right':[42,250],'wrist-left':[466,250],
 'hand-right':[37,288],'hand-left':[474,283],
 'hip-right':[62,319],'hip-left':[439,326],
 'knee-right':[115,382],'knee-left':[413,382],
 'ankle-right':[119,472],'ankle-left':[396,472],
};

export function renderSpinalForm({assessment,form,patient,visit,renderField}){
 const render=field=>renderField(field,form.fields[field.id]);
 const card=(title,body,classes='')=>`<section class="measurement-card identity-card spinal-survey ${classes}"><h3>${title}</h3>${body}</section>`;
 const cover=card('기본 정보',`
  <div class="spinal-cover">
   <div class="spinal-cover-header">
    <dl><div><dt>작성일</dt><dd>${e(visit.date)}</dd></div>
    <div><dt>생년월일</dt><dd>${e(patient.identity.birth?.slice(0,7))}</dd></div>
    <div><dt>성별</dt><dd>${e(patient.identity.sex||'미입력')}</dd></div></dl>
    <div class="spinal-cover-identifiers">${spinalCoverFields.slice(0,2).map(render).join('')}</div>
   </div>
   <div class="measurement-fields">${spinalCoverFields.slice(2).map(render).join('')}</div>
  </div>`);
 const [pain,neck,back]=spinalSurveySections;
 const painMap=card(pain.title,`<p>${e(pain.help)}</p>
  <div class="spinal-pain-map">
   <img src="/reference/sca-pain-map.png" alt="정면 인체 그림. 화면 왼쪽은 대상자 오른쪽입니다.">
   ${pain.fields.map(field=>{
    const [left,top]=painPositions[field.id.slice('sca-pain-'.length)];
    return `<div class="spinal-pain-slot" style="--left:${left/530*100}%;--top:${top/565*100}%">${render(field)}</div>`;
   }).join('')}
  </div>`);
 const questionnaireSource='<p class="helper">첨부 검사지에 기반한 한국어 문항입니다. 검증된 표준 한국어판과의 문구 일치는 확인되지 않았습니다.</p>';
 const neckSurvey=card(neck.title,`<p>${e(neck.help)}</p>${questionnaireSource}<div class="spinal-ndi-columns">
  <div>${neck.fields.slice(0,5).map(render).join('')}</div>
  <div>${neck.fields.slice(5).map(render).join('')}</div>
 </div><p>총점 <output data-spinal-total="ndi">—</output></p>`);
 const backSurvey=card(back.title,`<p>${e(back.help)}</p>${questionnaireSource}
  ${back.fields.map(render).join('')}
  <p>점수 <output data-spinal-total="rmdq">—</output></p>`);

 const fields=new Map(assessment.fields.map(field=>[field.id,field]));
 const table=(caption,columns,average=false)=>`<div class="spinal-table-scroll" tabindex="0" role="region" aria-label="${caption} 측정표">
  <table class="result-table spinal-table">
   <caption>${caption}</caption>
   <thead><tr><th scope="col">자세</th>${columns.map(([,label])=>`<th scope="col">${label}</th>`).join('')}${average?'<th scope="col">평균</th>':''}</tr></thead>
   <tbody>
   ${columns.some(([id])=>fields.has(id+'-direction'))?`<tr><th scope="row">기울기 방향</th>${columns.map(([id])=>`<td>${fields.has(id+'-direction')?render(fields.get(id+'-direction')):'—'}</td>`).join('')}</tr>`:''}
   <tr><th scope="row">측정값 <br>· 사진</th>${columns.map(([id])=>{
    const field=fields.get(id);
    return `<td>${render(field)}${renderSpinalPhoto(field,form.measurementPhotos?.[id])}</td>`;
   }).join('')}${average?'<td><output data-spinal-total="cv">—</output></td>':''}</tr>
   </tbody>
  </table>
 </div>`;
 const neutral=region=>[1,2,3].map(trial=>[`sca-${region}-${trial}`,`중립 ${trial}<br>(°)`]);
 const sca=card('척추 이마면 비대칭 (SCA)',`<p>목뼈 중립은 측정 사이에 1분간 쉬고, 선 자세로 돌아온 뒤 다시 엎드려 측정합니다. 중립 자세를 측정할 때마다 대상자 기준 기울기 방향을 먼저 선택한 뒤 각도를 입력하세요.</p>
  ${table('목뼈 (CCA)',neutral('cca'))}
  ${table('등허리뼈 (TCA)',[...neutral('tca'),['sca-tca-left','왼쪽 옆굽힘 (°)'],['sca-tca-right','오른쪽 옆굽힘 (°)']])}`);
 const fhp=card('앞쪽머리자세 (FHP)',`<p>걷기 속도와 세 시점의 머리척추각을 입력합니다. 세 각도가 모두 유효하면 평균을 표시합니다.</p>
  ${table('걷는 중 측정',[
   ['sca-fhp-speed','걷기 속도<br>(km/h)'],
   ...[15,20,25].map(seconds=>[`sca-fhp-cv-${seconds}`,`${seconds}초<br>(°)`]),
  ],true)}`);
 return cover+painMap+neckSurvey+backSurvey+sca+fhp;
}
