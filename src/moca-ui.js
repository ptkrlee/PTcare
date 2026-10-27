import {escape as e} from './icons.js';
import {mountDrawing} from './drawing.js';
const sourceSizes={'moca-k.png':[1131,1600],'moca-k2.png':[1132,1600]};
const crops={'moca-k.png':{trail:[55,240,355,330],cube:[440,225,155,150]},'moca-k2.png':{trail:[25,170,380,360],cube:[475,135,195,190]}};
function animalPicture(a,index){return `<img class="moca-animal-picture" src="/reference/${a.reference.replace('.png','')}-animal-${index+1}.svg" alt="이름대기 동물 그림 ${index+1}">`;}
const titles=['길 만들기','정육면체 복사','시계 그리기'];
export const legacyObservation=(form,id)=>String(id)==='0'&&(form.drawingModes?.[id]==='observation'||!form.drawingModes?.[id]&&!form.drawingSizes?.[id]&&!!form.drawings?.[id]?.length);
function geometry(form,id){return form.drawingSizes?.[id]||{width:800,height:form.drawings?.[id]?.length?350:600};}
function cubeModel(a){const [width,height]=sourceSizes[a.reference],crop=crops[a.reference].cube;return `<svg class="moca-cube-model" viewBox="${crop.join(' ')}" role="img" aria-label="첨부 원문 정육면체 모델"><image href="/reference/${a.reference}" width="${width}" height="${height}"/></svg>`;}
function drawingBlock(a,f,id){const g=geometry(f,id),legacy=legacyObservation(f,id);return `<div class="drawing-block moca-inline-drawing"><p class="helper">${legacy?'이전 방식의 관찰 메모입니다. 원문 과제를 시작하려면 그림 지우기를 눌러 전환하세요. 이전 메모는 보관됩니다.':id===0?'첨부 검사지의 원본 배열에 선을 이어 그립니다.':id===1?'원본 모형을 보고 빈칸에 그대로 그립니다.':'원을 포함한 시계를 그리고, 숫자와 11시 10분의 바늘을 그립니다.'} 그림은 치료사가 아래에서 채점합니다.</p>${id===1?cubeModel(a):''}<canvas width="${g.width}" height="${g.height}" data-drawing="${id}" aria-label="${titles[id]} 그리기"></canvas><div class="chart-toolbar"><button type="button" class="button primary" data-patient-drawing="${id}">${legacy?'이전 관찰 메모 크게 보기':'대상자에게 보여주기 · 크게 그리기'}</button><button type="button" class="button secondary compact" data-undo-drawing="${id}">↶ 한 획 실행 취소</button><span class="drawing-shortcut">Ctrl / ⌘ + Z</span><button type="button" class="text-button" data-clear-drawing="${id}">이 그림 지우기</button></div></div>`;}
export function renderMocaQuestions({assessment:a,form:f,summary:s,key,renderField,renderQuestion}){
 const field=id=>{const spec=a.fields.find(field=>field.id===key+'-'+id);return spec?renderField(spec,f.fields[spec.id]):'';};
 const display={...f,answers:s.answers};
 const recall=()=>`<section class="moca-recall-section" id="${key}-recall-section"><h3>지연회상 · 시행 및 회상 방법</h3><details class="recall-instructions"><summary>시행 순서·단서 사용 안내</summary><p class="helper">기록 위치를 어휘력 다음으로 배치했습니다. 실제 검사는 실시요강에 따라 기억 학습 약 5분 후, 추상력 과제까지 시행한 뒤 진행하세요. 단서 없이 자발적으로 회상하면 1점이며 단서 후 회상은 0점입니다. 아래 정답·단서는 검사자용입니다. 자유회상을 모두 마친 뒤, 회상하지 못한 단어에만 범주 → 선다형 순서로 단서를 주세요.</p></details>${!f.fields[key+'-recall-status']&&a.items.some(item=>item.id.startsWith(key+'-recall-')&&typeof f.answers[item.id]==='number')?'<p class="helper">이전 수기 회상 점수는 보존 중입니다. 시행 여부를 선택하면 회상 방법으로 자동 채점합니다.</p>':''}<div class="measurement-fields">${field('recall-status')}${field('recall-time')}</div><div class="recall-words-grid">${a.words.map((word,i)=>{const item=a.items.find(item=>item.id===key+'-recall-'+i),value=s.answers[item.id];return `<fieldset class="question-card moca-recall-word" id="${item.id}"><legend><span class="recall-target"><small>정답 단어</small><strong>${e(word)}</strong></span><span data-question-state class="question-state">${typeof value==='number'?value+'점':'미선택'}</span></legend><details class="recall-cue-guide"><summary>단서 보기 · 검사자용</summary><span>범주 단서 <b>${e(a.recallCues[i].category)}</b></span><span>선다형 <b>${e(a.recallCues[i].choices.join(' · '))}</b></span></details><div class="question-embedded">${field('cue-'+i)}</div><p class="sr-only" data-auto-reason>${e(s.automatic[item.id]?.reason||'시행 여부와 회상 방법을 선택하면 자동 채점합니다.')}</p></fieldset>`;}).join('')}</div></section>`;
 return a.items.map((item,i)=>{
  if(item.id.startsWith(key+'-recall-'))return '';
  let embedded='';
  if(item.id.startsWith(key+'-naming-')){const n=Number(item.id.at(-1));embedded=`<div class="animal-task">${animalPicture(a,n)}<button class="button secondary compact" type="button" data-patient-animal="${n}">그림만 크게 보여주기</button></div>`;}
  if(item.id===key+'-trail')embedded=drawingBlock(a,f,0);
  if(item.id===key+'-cube')embedded=drawingBlock(a,f,1);
  if(item.id===key+'-clock-contour')embedded=drawingBlock(a,f,2);
  if(item.id===key+'-vigilance')embedded=field('vigilance-errors');
  if(item.id===key+'-serial7')embedded=field('serial7-correct');
  if(item.id===key+'-fluency')return `<fieldset class="question-card" id="${item.id}"><legend><span class="question-number">${String(i+1).padStart(2,'0')}</span><span>${e(item.title)}</span><span class="question-state" data-question-state>${typeof s.answers[item.id]==='number'?s.answers[item.id]+'점':'미선택'}</span></legend><p class="question-note">${e(item.note)}</p><div class="question-embedded">${field('fluency-count')}</div><p class="question-note" data-auto-reason>${e(s.automatic[item.id]?.reason||'인정되는 단어 수만 입력하세요. 실제 단어를 적을 필요가 없습니다.')}</p></fieldset>`+recall();
  let html=renderQuestion(item,i,display,s.automatic[item.id],embedded);
  if(item.id===key+'-naming-2')html+=`<section class="identity-card moca-learning"><h3>기억 학습 · 1차 / 2차</h3><p class="helper">두 번 모두 시행합니다. 들려준 단어 중 회상한 단어만 체크하세요. 이 학습 단계에는 점수를 더하지 않습니다.</p><div class="measurement-fields">${field('memory-1-status')}${field('memory-1')}${field('memory-2-status')}${field('memory-2')}</div></section>`;
  return html;
 }).join('');
}
export function mountMocaDrawing(canvas,strokes,onChange,a,id,{legacy=false,editable=true}={}){
 let image=null,controller;const background=id==='0'&&!legacy?ctx=>{if(!image?.complete||!image.naturalWidth)return;const [x,y,w,h]=crops[a.reference].trail,scale=Math.min(canvas.width/w,canvas.height/h),dw=w*scale,dh=h*scale;ctx.drawImage(image,x,y,w,h,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);}:null;
 if(background){image=new Image();image.onload=()=>controller?.redraw();image.src='/reference/'+a.reference;}
 controller=mountDrawing(canvas,strokes,onChange,{background,editable});return controller;
}
export function bindMocaDrawings(o){
 const controllers=new Map();const a=o.assessment;
 function showAnimal(index){o.modal(`<div class="patient-animal-screen"><h2>동물 이름대기 · 그림 ${index+1}</h2><p>이 동물의 이름을 말씀해 주세요.</p>${animalPicture(a,index)}<div class="dialog-actions">${index<2?`<button type="button" class="button primary" id="next-animal">다음 그림</button>`:''}<button type="button" class="button secondary" data-close>치료사 채점으로 돌아가기</button></div></div>`);document.querySelector('#app-dialog').classList.add('patient-animal-dialog');document.querySelector('#next-animal')?.addEventListener('click',()=>{o.closeModal();showAnimal(index+1);});}
 document.querySelectorAll('[data-patient-animal]').forEach(button=>button.onclick=()=>showAnimal(Number(button.dataset.patientAnimal)));

 function save(id,value,canvas){o.editForm(form=>{const oldObservation=legacyObservation(form,id);form.drawings||={};form.drawingSizes||={};form.drawingModes||={};form.drawingModes[id]=oldObservation?'observation':'source-task-v1';form.drawings[id]=value;form.drawingSizes[id]={width:canvas.width,height:canvas.height};});}
 document.querySelectorAll('[data-drawing]').forEach(canvas=>{const id=canvas.dataset.drawing;controllers.set(id,mountMocaDrawing(canvas,o.form.drawings?.[id],value=>save(id,value,canvas),a,id,{legacy:legacyObservation(o.form,id)}));});
 document.querySelectorAll('[data-undo-drawing]').forEach(button=>button.onclick=()=>{controllers.get(button.dataset.undoDrawing)?.undo();document.querySelector(`[data-drawing="${button.dataset.undoDrawing}"]`)?.focus({preventScroll:true});});
 document.querySelectorAll('[data-clear-drawing]').forEach(button=>button.onclick=()=>{const id=button.dataset.clearDrawing;o.modal('<h2>이 그림을 지울까요?</h2><p>다른 그림과 평가 점수는 유지됩니다.</p><div class="dialog-actions"><button class="button secondary" data-close>취소</button><button class="button primary" id="clear-drawing">그림 지우기</button></div>');document.querySelector('#clear-drawing').onclick=()=>{if(legacyObservation(o.getForm(),id)){o.editForm(form=>{form.drawingHistory||=[];form.drawingHistory.push({id,strokes:form.drawings[id],size:geometry(form,id),mode:'observation',at:new Date().toISOString()});form.drawings[id]=[];form.drawingSizes||={};form.drawingSizes[id]={width:800,height:600};form.drawingModes||={};form.drawingModes[id]='source-task-v1';});o.closeModal();o.refresh();}else{controllers.get(id).clear();o.closeModal();}};});
 document.querySelectorAll('[data-patient-drawing]').forEach(button=>button.onclick=()=>{
  const id=button.dataset.patientDrawing,form=o.getForm(),g=geometry(form,id);
  const instruction=legacyObservation(form,id)?'이전 관찰 메모입니다. 원문 과제로 전환하려면 이 화면을 닫고 그림 지우기를 선택하세요.':id==='0'?'숫자와 글자를 번갈아 순서대로 선으로 이어주세요.':id==='1'?'위 모형과 똑같이 아래 빈칸에 그려주세요.':'시계를 그려주세요. 숫자를 모두 쓰고, 11시 10분을 가리키도록 바늘을 그려주세요.';
  o.modal(`<div class="patient-drawing-screen"><h2>${titles[Number(id)]}</h2><p>${instruction}</p>${id==='1'?cubeModel(a):''}<canvas width="${g.width}" height="${g.height}" id="patient-task-canvas" aria-label="대상자 ${titles[Number(id)]}"></canvas><div class="patient-drawing-actions"><button type="button" class="button secondary" id="undo-patient-drawing">↶ 한 획 실행 취소</button><span class="drawing-shortcut">Ctrl / ⌘ + Z</span></div><button type="button" class="button primary" id="finish-patient-drawing">그리기 완료 · 치료사 채점으로</button></div>`);
  document.querySelector('#app-dialog').classList.add('patient-task-dialog');const canvas=document.querySelector('#patient-task-canvas');const patientController=mountMocaDrawing(canvas,form.drawings?.[id],value=>{save(id,value,canvas);controllers.get(id).replace(value);},a,id,{legacy:legacyObservation(form,id)});
  document.querySelector('#undo-patient-drawing').onclick=()=>{patientController.undo();canvas.focus({preventScroll:true});};
  document.querySelector('#finish-patient-drawing').onclick=()=>{o.closeModal();button.focus({preventScroll:true});};
 });
}
