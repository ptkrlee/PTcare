import {escape as e} from './icons.js';
import {readReport} from './report-import.js';
const labels={'asm-height':'키 (cm)','asm-mass':'사지골격근량 ASM (kg)','asm-index':'ASM 지수 SMI (kg/m²)','right-arm':'오른팔 (kg)','left-arm':'왼팔 (kg)','right-leg':'오른다리 (kg)','left-leg':'왼다리 (kg)'};
export function renderReportImport(){return `<section class="identity-card report-import"><h3>인바디·근육량 결과지 가져오기</h3><p class="helper">PDF 또는 사진에서 필요한 수치를 읽습니다. 원본과 대조한 뒤 선택한 값만 현재 회차에 반영합니다. 원본 파일·인식 전문은 저장·전송하지 않습니다. 골격근량(SMM)은 사지골격근량(ASM)과 다릅니다.</p><label class="button secondary">결과지 PDF·사진 선택<input id="muscle-report-file" type="file" accept="application/pdf,image/*"></label><p id="report-import-status" role="status"></p><div id="report-import-review"></div></section>`;}
export function bindReportImport({editForm,refresh,getPatient,patientId}){
 const input=document.querySelector('#muscle-report-file'),status=document.querySelector('#report-import-status'),review=document.querySelector('#report-import-review');let generation=0;
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;const run=++generation;input.disabled=true;review.innerHTML='';status.textContent='결과지 확인 중…';
  try{
   const result=await readReport(file,text=>{if(status.isConnected&&generation===run)status.textContent=text;});
   if(!input.isConnected||generation!==run||getPatient()!==patientId)return;
   const candidates=new Map(result.candidates.map(x=>[x.id,x]));status.textContent=result.candidates.length?'인식한 값을 확인해 주세요. 아직 기록에 반영되지 않았습니다.':'명확한 수치를 찾지 못했습니다. 원본을 보며 필요한 값만 직접 입력할 수 있습니다.';
   review.innerHTML=`<p class="helper">각 값의 단위·측정일·대상자가 맞는지 확인하세요. 선택하지 않은 값은 유지합니다. 부위별 값은 제지방/근육량인지 확인해야 하며 체지방량은 사용하지 않습니다.</p><div class="report-review-grid">${Object.entries(labels).map(([id,label])=>{const c=candidates.get(id);return `<label class="report-review-row"><span><input type="checkbox" data-import-check="${id}"> ${e(label)}</span><input type="number" data-import-value="${id}" min="0.01" max="${id==='asm-height'?250:id==='asm-index'?50:id==='asm-mass'?100:30}" step="0.01" value="${c&&!c.ambiguous?e(c.value):''}" aria-label="확인한 ${e(label)}"><small>${c?.ambiguous?'여러 값 인식: '+e(c.alternatives.join(' / '))+' · 원본 확인 필요':c?'인식 후보: '+e(c.source):'자동 인식 안 됨 · 선택 입력'}</small></label>`;}).join('')}</div><label class="report-confirm"><input type="checkbox" id="report-confirm-source"> 현재 대상자의 결과지와 수치·단위를 대조했습니다. 네 부위 합계 사용 시 각 값이 부위별 제지방/근육량임을 확인했습니다.</label><p class="helper">직접 ASM을 선택하면 해당 값을 사용합니다. 직접 ASM이 없고 좌·우 팔·다리 4개를 모두 선택하면 그 합계를 ASM 후보로 반영합니다. 기존 값은 선택한 항목만 덮어씁니다. 측정 방법과 결과지 측정일은 반영 후 확인하세요.</p><p id="report-review-error" role="alert"></p><div class="chart-toolbar"><button type="button" id="apply-muscle-report" class="button primary">확인한 항목만 반영</button><button type="button" id="cancel-muscle-report" class="button secondary">취소 · 버리기</button></div>`;
   document.querySelector('#cancel-muscle-report').onclick=()=>{generation++;review.innerHTML='';status.textContent='가져오기를 취소했습니다. 기존 값은 유지됩니다.';};
   document.querySelector('#apply-muscle-report').onclick=()=>{
    const error=document.querySelector('#report-review-error');if(!document.querySelector('#report-confirm-source').checked){error.textContent='원본을 대조한 뒤 확인에 체크해 주세요.';return;}
    const values={};for(const check of review.querySelectorAll('[data-import-check]:checked')){const value=review.querySelector(`[data-import-value="${check.dataset.importCheck}"]`);if(!value.value||!value.checkValidity()){error.textContent='선택한 항목의 유효한 숫자와 단위를 확인해 주세요.';return;}values[check.dataset.importCheck]=Number(value.value);}
    if(!Object.keys(values).length){error.textContent='반영할 항목을 하나 이상 선택해 주세요.';return;}
    let segmentSum=false;if(values['asm-mass']===undefined&&['right-arm','left-arm','right-leg','left-leg'].every(id=>values[id]!==undefined)){values['asm-mass']=Number(['right-arm','left-arm','right-leg','left-leg'].reduce((sum,id)=>sum+values[id],0).toFixed(2));segmentSum=true;}
    const mapped=Object.keys(values).filter(id=>id.startsWith('asm-'));if(!mapped.length){error.textContent='ASM 합계에는 팔·다리 4개 값이 모두 필요합니다. 일부 부위만으로 계산하지 않습니다.';return;}
    if(getPatient()!==patientId)return;
    editForm(form=>{for(const id of mapped)form.fields[id]=String(values[id]);form.reportImport={reviewedAt:new Date().toISOString(),fields:mapped,segmentSum,segments:segmentSum?Object.fromEntries(Object.entries(values).filter(([id])=>!id.startsWith('asm-'))):undefined};});refresh();
   };
  }catch{if(status.isConnected)status.textContent='파일을 읽지 못했습니다. 15MB 이하·3쪽 이내 PDF 또는 JPEG·PNG 사진으로 다시 선택하거나 수치를 직접 입력해 주세요.';}
  finally{if(input.isConnected){input.disabled=false;input.value='';}}
 };
}
