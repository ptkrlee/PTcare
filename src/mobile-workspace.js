import {escape as e} from './icons.js';
const mobile=()=>matchMedia('(max-width: 700px)').matches;
export function bindChartSteps(root,state,key){
 try{if(state.mobileStep===undefined){Object.assign(state,JSON.parse(sessionStorage.getItem('ptcare-ui-steps:'+key)||'{}'));}}catch{}
 const shell=root.querySelector('.chart-workspace'),nav=root.querySelector('.chart-section-nav');if(!shell||!nav)return;
 const links=[...nav.querySelectorAll('[data-scroll]')],sections=links.map(link=>root.querySelector('#'+link.dataset.scroll));
 const bar=document.createElement('div');bar.className='mobile-step-controls';bar.innerHTML='<button type="button" data-step-prev>이전</button><span data-step-caption aria-live="polite"></span><button type="button" data-step-next>다음</button><button type="button" data-step-all aria-pressed="false">전체 보기</button>';nav.after(bar);
 let index=Math.max(0,links.findIndex(x=>x.dataset.scroll===state.mobileStep));
 const learning=root.querySelector('.case-learning-panel');if(learning){learning.open=!mobile()||!!state.mobileAll||!!state.learningOpen;learning.ontoggle=()=>{state.learningOpen=learning.open;};}
 const apply=()=>{try{sessionStorage.setItem('ptcare-ui-steps:'+key,JSON.stringify({mobileStep:state.mobileStep,mobileAll:!!state.mobileAll}));}catch{}shell.classList.toggle('mobile-step-mode',!state.mobileAll);sections.forEach((section,i)=>section.classList.toggle('mobile-step-inactive',i!==index));links.forEach((link,i)=>{link.classList.toggle('step-active',i===index);if(i===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});bar.querySelector('[data-step-caption]').textContent=`${index+1} / ${sections.length}`;bar.querySelector('[data-step-prev]').disabled=index===0;bar.querySelector('[data-step-next]').disabled=index===sections.length-1;bar.querySelector('[data-step-all]').textContent=state.mobileAll?'단계별 보기':'전체 보기';bar.querySelector('[data-step-all]').setAttribute('aria-pressed',String(!!state.mobileAll));};
 const go=(i,scroll=true)=>{index=i;state.mobileStep=links[i].dataset.scroll;apply();if(scroll){if(mobile()){nav.scrollIntoView({block:'start'});links[i].scrollIntoView({block:'nearest',inline:'nearest'});}else sections[i].scrollIntoView({block:'start',behavior:'smooth'});}};
 links.forEach((link,i)=>link.onclick=event=>{event.preventDefault();go(i);});
 bar.querySelector('[data-step-prev]').onclick=()=>go(index-1);bar.querySelector('[data-step-next]').onclick=()=>go(index+1);bar.querySelector('[data-step-all]').onclick=()=>{state.mobileAll=!state.mobileAll;if(learning){learning.open=!!state.mobileAll||!!state.learningOpen;}apply();};apply();
 return id=>{const i=links.findIndex(link=>link.dataset.scroll===id);if(i>=0)go(i);};
}
export function bindAssessmentJumps(root){
 const section=root.querySelector('.question-section');if(!section)return;
 // Keep direct answers and mirrored left/right records visible; navigation never auto-advances.
 const candidates=[...section.querySelectorAll('.measurement-card .measurement-field,.measurement-card .memory-checks,.clinical-scope,.clinical-movement,.basic-section,.question-card,.moca-recall-section,.comment-card')];
 const targets=candidates.filter(node=>!node.closest('[hidden]')&&!candidates.some(parent=>parent!==node&&parent.contains(node)));
 if(!targets.length)return;
 const bar=document.createElement('nav');bar.className='assessment-jumps';bar.setAttribute('aria-label','문항 및 영역 바로가기');
 const title=node=>(node.querySelector('h3,h4,legend,label')?.textContent||node.textContent).trim().replace(/\s+/g,' ').slice(0,60);
 bar.innerHTML=`<label>바로가기<select aria-label="문항 및 영역 선택">${targets.map((node,i)=>`<option value="${i}">${i+1}. ${e(title(node))}</option>`).join('')}</select></label><button type="button" data-jump-prev aria-label="이전 문항 또는 영역">이전</button><button type="button" data-jump-next aria-label="다음 문항 또는 영역">다음</button>`;
 const select=bar.querySelector('select');let index=0;
 function status(){bar.querySelector('[data-jump-prev]').disabled=index===0;bar.querySelector('[data-jump-next]').disabled=index===targets.length-1;select.value=String(index);}
 function go(i){index=i;const target=targets[i];target.closest('details')?.setAttribute('open','');target.scrollIntoView({block:'start'});status();}
 select.onchange=()=>go(Number(select.value));bar.querySelector('[data-jump-prev]').onclick=()=>go(Math.max(0,index-1));bar.querySelector('[data-jump-next]').onclick=()=>go(Math.min(targets.length-1,index+1));
 // Track manual scrolling with no focus changes or scrolling caused by answering.
 const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top-90)-Math.abs(b.boundingClientRect.top-90));if(visible.length){index=targets.indexOf(visible[0].target);status();}},{rootMargin:'-90px 0px -45% 0px'});targets.forEach(node=>observer.observe(node));
 // Disconnect when route rerenders; observers must not accumulate across visits.
 const cleanup=new MutationObserver(()=>{if(!bar.isConnected){observer.disconnect();cleanup.disconnect();}});cleanup.observe(root,{childList:true,subtree:true});
 section.querySelector('.assessment-heading').after(bar);status();
}
