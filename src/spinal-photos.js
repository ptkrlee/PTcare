import {compressServicePhoto,safePhoto} from './charting/service-record.js';
import {escape as e} from './icons.js';

function photoControls(label,photo){
 return `<label class="spinal-photo-control"><input class="sr-only" type="file" accept="image/*" capture="environment" data-spinal-photo-file aria-label="${e(label)} 사진 촬영">촬영</label>
  <label class="spinal-photo-control"><input class="sr-only" type="file" accept="image/*" data-spinal-photo-file aria-label="${e(label)} 사진 첨부">${photo?'교체':'첨부'}</label>
  ${photo?`<button type="button" data-spinal-photo-view aria-label="${e(label)} 사진 보기"><img src="${photo}" alt="">보기</button>`:''}
  <span class="spinal-photo-status" role="status"></span>`;
}

export function renderSpinalPhoto(field,photo){
 return `<div class="spinal-photo" data-spinal-photo="${e(field.id)}" data-label="${e(field.label)}">${photoControls(field.label,safePhoto(photo?.data))}</div>`;
}

export function bindSpinalPhotos(root,{editForm,modal}){
 for(const slot of root.querySelectorAll('[data-spinal-photo]')){
  const id=slot.dataset.spinalPhoto,label=slot.dataset.label;
  const commit=photo=>editForm((form,visit,document)=>{
   if(photo){
    form.measurementPhotos={...form.measurementPhotos,[id]:photo};
    if(new TextEncoder().encode(JSON.stringify(document)).length>3700000){
     throw new Error('이 대상자의 저장 용량이 가득 찼습니다. 기존 사진을 정리한 뒤 다시 시도하세요.');
    }
   }else if(form.measurementPhotos){
    delete form.measurementPhotos[id];
    if(!Object.keys(form.measurementPhotos).length)delete form.measurementPhotos;
   }
  },{keepClosure:true});
  slot.addEventListener('change',async event=>{
   const input=event.target;
   if(!input.matches('[data-spinal-photo-file]')||!input.files[0])return;
   const status=slot.querySelector('[role=status]');
   const inputs=[...slot.querySelectorAll('input')];
   inputs.forEach(control=>control.disabled=true);
   status.classList.remove('spinal-photo-error');
   status.textContent='준비 중…';
   try{
    const photo=await compressServicePhoto(input.files[0],{maxDimension:720,maxDataLength:36000});
    if(!slot.isConnected)return;
    commit(photo);
    slot.innerHTML=photoControls(label,safePhoto(photo.data));
    slot.querySelector('[role=status]').textContent='사진 첨부됨';
   }catch(error){
    if(slot.isConnected){
     status.classList.add('spinal-photo-error');
     status.textContent=error.message;
    }
   }finally{
    inputs.forEach(control=>control.disabled=false);
    input.value='';
   }
  });
  slot.addEventListener('click',event=>{
   const view=event.target.closest('[data-spinal-photo-view]');
   if(!view)return;
   const source=safePhoto(view.querySelector('img').getAttribute('src'));
   if(!source)return;
   modal(`<h2>${e(label)} 사진</h2><img class="spinal-photo-preview" src="${source}" alt="${e(label)} 사진"><div class="dialog-actions"><button type="button" class="button secondary" data-remove-spinal-photo>사진 삭제</button><button type="button" class="button primary" data-close>닫기</button></div>`);
   const dialog=document.querySelector('#app-dialog');
   dialog.querySelector('[data-remove-spinal-photo]').onclick=()=>{
    if(!slot.isConnected)return;
    commit(null);
    slot.innerHTML=photoControls(label,'');
    slot.querySelector('[role=status]').textContent='사진 삭제됨';
    dialog.close();
   };
  });
 }
}
