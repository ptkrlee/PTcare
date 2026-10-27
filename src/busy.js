let pending=0,dialog=null,timer=null;
const wrapped=Symbol('ptcare-busy-wrapped');
export function beginBusy(){
 pending++;
 if(!dialog?.isConnected){dialog=document.createElement('dialog');dialog.id='processing-dialog';dialog.className='processing-dialog';dialog.setAttribute('aria-label','처리중입니다');dialog.innerHTML='<div class="processing-card" role="status" aria-live="polite"><span class="processing-spinner" aria-hidden="true"></span><strong>처리중입니다</strong><p>잠시만 기다려 주세요.</p></div>';dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(dialog);dialog.showModal();document.querySelector('#app')?.setAttribute('aria-busy','true');timer=setTimeout(()=>{const node=dialog?.querySelector('p');if(node)node.textContent='시간이 걸리고 있습니다. 연결 상태를 확인하며 기다려 주세요.';},12000);}
 let done=false;return ()=>{if(done)return;done=true;pending=Math.max(0,pending-1);if(!pending){clearTimeout(timer);dialog?.close();dialog?.remove();dialog=null;document.querySelector('#app')?.removeAttribute('aria-busy');}};
}
export async function withBusy(action){const finish=beginBusy();try{return await action();}finally{finish();}}
function showError(){const node=document.createElement('div');node.className='action-error-toast';node.setAttribute('role','alert');node.textContent='처리 결과를 확인하지 못했습니다. 저장 상태를 확인한 뒤 다시 시도해 주세요.';const close=document.createElement('button');close.type='button';close.textContent='닫기';close.onclick=()=>node.remove();node.append(close);document.body.append(node);}
export function installActionFeedback(root){
 const scan=()=>{for(const node of root.querySelectorAll('button,form,input[type=file]'))for(const property of node.tagName==='FORM'?['onsubmit']:node.tagName==='INPUT'?['onchange']:['onclick']){if(node.matches('[data-undo-drawing]'))continue;const handler=node[property];if(typeof handler!=='function'||handler[wrapped])continue;const wrapper=function(event){event.preventDefault();if(this.dataset.processing==='true')return;this.dataset.processing='true';withBusy(()=>handler.call(this,event)).catch(showError).finally(()=>delete this.dataset.processing);};wrapper[wrapped]=true;node[property]=wrapper;}};
 new MutationObserver(scan).observe(root,{childList:true,subtree:true});scan();
}
