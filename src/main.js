import './style.css';
import './platform.css';
import { assessments, getAssessment, summarize } from './data.js';

const icons = {
  plus:'<path d="M12 5v14M5 12h14"/>',
  balance:'<path d="M12 4v16M5 20h14M4 8h16M6 8l-4 7h8L6 8Zm12 0-4 7h8l-4-7Z"/>',
  activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  arrow:'<path d="m9 5 7 7-7 7"/>', check:'<path d="m5 12 4 4L19 6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  sheet:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  print:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  back:'<path d="m12 5-7 7 7 7M5 12h14"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const state={started:false,active:'bbs',identity:{name:'',date:localDate(),birth:''},answers:{bbs:{},mbi:{},satisfaction:{}},mobility:'walking',comment:'',result:false};
const root=document.querySelector('#app');
const typeIcon=key=>({bbs:'balance',mbi:'activity',satisfaction:'heart'}[key]);
const current=()=>getAssessment(state.active,state.mobility);
const summary=()=>summarize(current(),state.answers[state.active]);

function render(){
  if(state.result){renderResult();return;}
  const a=current(),s=summary();
  root.innerHTML=`
    <header class="site-header"><div class="header-inner"><a class="brand" href="./" aria-label="PTcare 처음으로"><span class="brand-mark">${icon('plus')}</span><span>PT<span class="brand-light">care</span></span></a><span class="header-divider"></span><span class="header-caption">방문운동 평가 기록지</span><span class="private-badge">${icon('lock')} 기록을 저장하지 않아요</span></div></header>
    <main class="workspace">
      <section class="intro"><div class="eyebrow"><span class="tiny-dot"></span> EVERYDAY MOVEMENT, BETTER CARE</div><h1>한 번의 체크로,<br class="mobile-break"> 더 간편한 평가 기록.</h1><p>평가 항목을 선택하면 점수가 자동으로 계산됩니다.<br class="mobile-break"> 먼저 대상자 정보를 입력하고 평가를 시작하세요.</p><div class="intro-decoration" aria-hidden="true"><span></span>${icon('activity')}</div></section>
      <section class="identity-card" aria-labelledby="identity-title"><div class="section-title"><span class="step">01</span><h2 id="identity-title">기본 정보</h2><span class="section-hint">결과지에 함께 표시됩니다</span></div><div class="identity-fields"><label>대상자 성명 <span class="required">*</span><input id="person-name" name="name" autocomplete="off" maxlength="40" placeholder="성명을 입력하세요" value="${escape(state.identity.name)}" required></label><label>평가일 <span class="required">*</span><input id="person-date" name="date" type="date" min="1900-01-01" max="2100-12-31" value="${escape(state.identity.date)}" required></label><label>생년월일 <span class="required">*</span><input id="person-birth" name="birth" type="date" min="1900-01-01" max="${localDate()}" value="${escape(state.identity.birth)}" required></label></div>${!state.started?`<p class="start-help">먼저 대상자 정보를 입력한 뒤 평가를 시작해 주세요.</p><button type="button" class="button primary" id="start-evaluation">이 대상자 평가 시작하기 ${icon('arrow')}</button>`:''}</section>
      <nav ${!state.started?'hidden':''} class="assessment-tabs" aria-label="평가 종류">${Object.entries(assessments).map(([key,item],i)=>`<button type="button" class="tab ${state.active===key?'active':''}" data-tab="${key}" aria-current="${state.active===key?'page':'false'}"><span class="tab-icon">${icon(typeIcon(key))}</span><span class="tab-text"><span class="tab-number">0${i+1} <span>${item.code==='만족도'?'SURVEY':item.code}</span></span><strong>${item.short}</strong></span>${icon('arrow','tab-arrow')}</button>`).join('')}</nav>
      <div ${!state.started?'hidden':''} class="assessment-layout"><section class="question-section" aria-labelledby="assessment-title"><div class="assessment-heading"><div class="section-title"><span class="step">02</span><h2 id="assessment-title">${a.title}</h2></div><p>${a.english}<span> ${a.unit}</span></p></div>
        <div class="instruction">${icon('info')}<p>${state.active==='bbs'?'각 동작을 관찰한 뒤 해당하는 수행 수준을 한 가지 선택해 주세요.':state.active==='mbi'?'평소 수행 능력을 기준으로 필요한 도움의 정도를 선택해 주세요.':'서비스를 이용하며 느낀 점과 가장 가까운 응답을 선택해 주세요.'}</p></div>
        ${state.active==='mbi'?`<div class="mobility-card"><label for="mobility">이동 평가 방식</label><select id="mobility"><option value="walking" ${state.mobility==='walking'?'selected':''}>보행 평가 · 100점 만점</option><option value="wheelchair" ${state.mobility==='wheelchair'?'selected':''}>의자차 대체 평가 · 90점 만점</option></select><p>보행과 의자차는 중복 합산하지 않습니다. 의자차 선택 시 보행(15점)을 의자차(5점)로 대체하며, 100점으로 환산하지 않습니다. 원문에 대체 적용 기준이 없어 기관 기준을 확인해 주세요.</p></div>`:''}
        <div class="questions">${a.items.map((item,i)=>renderQuestion(item,i)).join('')}</div>
        ${state.active==='satisfaction'?`<section class="comment-card"><label for="comment">건의 및 개선사항 <span>선택 입력</span></label><textarea id="comment" rows="4" maxlength="1500" placeholder="서비스에 대한 의견을 자유롭게 남겨 주세요.">${escape(state.comment)}</textarea></section>`:''}
        <button type="button" class="button secondary reset-button mobile-reset">${icon('reset')} 현재 평가 초기화</button><div class="source-note">${icon('sheet')}<p>첨부해 주신 협회 공동 서식의 문항과 배점을 기준으로 구성했습니다.<br>평가 결과의 해석은 담당 전문가의 판단에 따릅니다.</p></div>
      </section>
      <aside class="score-sidebar"><div class="score-card"><div class="score-label"><span class="tiny-dot"></span> 실시간 평가 점수 <span>${a.code}</span></div><div class="score-number"><strong data-total>${s.total}</strong><span>/ ${a.max}<small>점</small></span></div><p class="score-status" data-status>${s.complete?'모든 항목을 평가했어요.':'선택한 항목의 부분 점수입니다.'}</p><div class="progress-label"><span>작성 진행률</span><strong data-progress-text>${s.answered}<span> / ${a.items.length}${s.skipped?' · 미평가 '+s.skipped:''}</span></strong></div><div class="progress-track"><span data-progress style="width:${s.answered/a.items.length*100}%"></span></div><div class="score-divider"></div><div class="completion-note">${icon('sheet')}<p>작성을 마치면<br><strong>캡처용 결과지</strong>를 확인하세요.</p></div><button class="button primary result-button" type="button">결과지 보기 ${icon('arrow')}</button><button class="button reset-button" type="button">${icon('reset')} 현재 평가 초기화</button><p class="sidebar-note">입력 내용은 이 화면에서만 유지됩니다.<br>새로고침하거나 닫으면 사라집니다.</p></div><div class="how-card"><span>이렇게 이용하세요</span><ol><li>기본 정보를 입력해 주세요.</li><li>평가 항목을 선택해 주세요.</li><li>결과지를 캡처해 보관하세요.</li></ol></div></aside></div>
      <footer><span class="footer-brand">PTcare</span><span>작은 움직임에서 시작하는 더 나은 일상.</span><span>개인정보 전송 · 서버 저장 없음</span></footer>
    </main>
    <div ${!state.started?'hidden':''} class="mobile-score"><div><span>${a.code} <span data-mobile-status>${s.complete?'총점':'부분 점수'}</span></span><strong><span data-mobile-total>${s.total}</span><small> / ${a.max}</small></strong></div><button class="button primary result-button" type="button">결과지 보기 ${icon('arrow')}</button></div>
    <dialog id="reset-dialog"><div class="dialog-content"><span class="dialog-icon">${icon('reset')}</span><h2>현재 평가를 다시 작성할까요?</h2><p>${a.title}의 선택 항목${state.active==='satisfaction'?'과 건의사항':''}만 지워집니다.<br>기본 정보와 다른 평가는 유지됩니다.</p><div class="dialog-actions"><button type="button" class="button secondary" id="cancel-reset">취소</button><button type="button" class="button primary" id="confirm-reset">초기화</button></div></div></dialog>
    <p class="sr-only" role="status" aria-live="polite" id="score-live"></p>`;
  bindEvents();
}
function renderQuestion(item,index){
  const selected=state.answers[state.active][item.id];
  return `<fieldset class="question-card ${selected!==undefined?'answered':''}" id="${item.id}"><legend><span class="question-number">${String(index+1).padStart(2,'0')}</span><span>${escape(item.title)}</span><span class="question-state" data-question-state>${selected===undefined?'미선택':`${selected==='skipped'?'미평가':selected+'점'} ${icon('check')}`}</span></legend>${item.note?`<p class="question-note">${escape(item.note)}</p>`:''}<div class="choices ${state.active==='satisfaction'?'likert':''}">${item.options.map((option,i)=>`<label class="choice"><input type="radio" name="${item.id}" id="${item.id}-${i}" value="${option.score}" ${selected===option.score?'checked':''}><span class="choice-mark"></span><span class="choice-text">${option?escape(option.label):'미평가 · 다음에 하기'}</span><span class="choice-score">${option.score}<small>점</small></span></label>`).join('')}<label class="choice skip-choice"><input type="radio" name="${item.id}" id="${item.id}-skip" value="skipped" ${selected==='skipped'?'checked':''}><span class="choice-mark"></span><span class="choice-text">미평가 · 다음에 하기</span><span class="choice-score">—</span></label></div></fieldset>`;
}
function bindEvents(){
  document.querySelector('#start-evaluation')?.addEventListener('click',()=>{
    for(const input of document.querySelectorAll('.identity-fields input')){
      if(input.name==='name'&&!input.value.trim())input.setCustomValidity('대상자 성명을 입력해 주세요.');
      if(!input.reportValidity())return;
    }
    state.started=true;render();document.querySelector('.assessment-tabs').scrollIntoView({block:'start',behavior:'smooth'});
  });
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{state.active=button.dataset.tab;render();document.querySelector(`[data-tab="${state.active}"]`).focus({preventScroll:true});}));
  document.querySelectorAll('.identity-fields input').forEach(input=>input.addEventListener('input',()=>{state.identity[input.name]=input.value;input.setCustomValidity('');}));
  document.querySelectorAll('input[type="radio"]').forEach(input=>input.addEventListener('change',()=>{
    state.answers[state.active][input.name]=input.value==='skipped'?'skipped':Number(input.value);
    const card=document.getElementById(input.name);card.classList.add('answered');card.querySelector('[data-question-state]').innerHTML=`${input.value==='skipped'?'미평가':input.value+'점'} ${icon('check')}`;
    updateScore();
  }));
  document.querySelector('#mobility')?.addEventListener('change',event=>{state.mobility=event.target.value;delete state.answers.mbi['mbi-8'];render();document.querySelector('#mobility').focus({preventScroll:true});});
  document.querySelector('#comment')?.addEventListener('input',event=>{state.comment=event.target.value;});
  document.querySelectorAll('.result-button').forEach(button=>button.addEventListener('click',showResult));
  document.querySelectorAll('.reset-button').forEach(button=>button.addEventListener('click',()=>document.querySelector('#reset-dialog').showModal()));
  document.querySelector('#cancel-reset').addEventListener('click',()=>document.querySelector('#reset-dialog').close());
  document.querySelector('#confirm-reset').addEventListener('click',()=>{state.answers[state.active]={};if(state.active==='satisfaction')state.comment='';render();[...document.querySelectorAll('.reset-button')].find(button=>button.offsetParent!==null)?.focus({preventScroll:true});});
}
function updateScore(){
  const a=current(),s=summary();
  document.querySelector('[data-total]').textContent=s.total;
  document.querySelector('[data-mobile-total]').textContent=s.total;
  document.querySelector('[data-mobile-status]').textContent=s.complete?'총점':'부분 점수';
  document.querySelector('[data-status]').textContent=s.complete?'모든 항목을 평가했어요.':'선택한 항목의 부분 점수입니다.';
  document.querySelector('[data-progress-text]').innerHTML=`${s.answered}<span> / ${a.items.length}${s.skipped?' · 미평가 '+s.skipped:''}</span>`;
  document.querySelector('[data-progress]').style.width=`${s.answered/a.items.length*100}%`;
  document.querySelector('#score-live').textContent=`${s.answered}개 항목 선택, ${s.complete?'총점':'부분 점수'} ${s.total}점, ${a.max}점 만점`;
}
function showResult(){
  const inputs=[...document.querySelectorAll('.identity-fields input')];
  for(const input of inputs){
    if(input.name==='name'&&!input.value.trim())input.setCustomValidity('대상자 성명을 입력해 주세요.');
    if(!input.checkValidity()){input.scrollIntoView({block:'center',behavior:'smooth'});input.reportValidity();return;}
  }
  const s=summary();
  if(!s.reviewed){
    const missing=s.selected.find(row=>!row.option&&!row.skipped).item;
    const card=document.getElementById(missing.id);card.classList.remove('needs-answer');void card.offsetWidth;card.classList.add('needs-answer');
    card.scrollIntoView({block:'center',behavior:'smooth'});card.querySelector('input').focus({preventScroll:true});
    document.querySelector('#score-live').textContent=`결과지를 보려면 각 항목에 응답하거나 미평가를 선택해 주세요. 미응답: ${missing.title}`;
    let notice=card.querySelector('.validation-message');if(!notice){notice=document.createElement('p');notice.className='validation-message';notice.setAttribute('role','alert');card.append(notice);}notice.textContent='응답 또는 ‘미평가 · 다음에 하기’를 선택해 주세요.';return;
  }
  state.result=true;render();window.scrollTo(0,0);document.querySelector('#result-heading').focus({preventScroll:true});
}
function renderResult(){
  const a=current(),s=summary();
  root.innerHTML=`<main class="result-page"><div class="result-toolbar"><button type="button" class="button secondary" id="back">${icon('back')} 평가로 돌아가기</button><span>이 화면을 캡처해서 보관하세요</span><button type="button" class="button primary" id="print">${icon('print')} 인쇄 / PDF</button></div><article class="result-sheet"><header class="result-header"><span class="result-brand">${icon('plus')} PTcare</span><span>방문운동 평가 기록지</span></header><div class="result-title"><span class="eyebrow">${escape(a.english)}</span><h1 id="result-heading" tabindex="-1">${a.title}</h1><p>${state.active==='mbi'?(state.mobility==='walking'?'보행 평가 · 100점 만점':'의자차 대체 평가 · 90점 만점 · 100점 환산 없음'):(s.complete?'전체 항목 평가 완료':'미평가 포함 · 부분 점수')}</p></div><dl class="result-person"><div><dt>대상자 성명</dt><dd>${escape(state.identity.name.trim())}</dd></div><div><dt>평가일</dt><dd>${escape(state.identity.date)}</dd></div><div><dt>생년월일</dt><dd>${escape(state.identity.birth)}</dd></div></dl><section class="result-score"><div><span>${s.complete?'최종 평가 점수':'미평가 포함 · 부분 점수'}</span><p>${s.answered}개 평가 · ${s.skipped}개 미평가</p></div><div><strong>${s.total}</strong><span> / ${a.max}점</span></div></section><table class="result-table"><caption class="sr-only">${a.title} 항목별 선택 내용과 점수</caption><thead><tr><th scope="col">평가 항목</th><th scope="col">선택 내용</th><th scope="col">점수</th></tr></thead><tbody>${s.selected.map(({item,option,skipped},i)=>`<tr><th scope="row"><span>${String(i+1).padStart(2,'0')}</span>${escape(item.title)}</th><td>${option?escape(option.label):'미평가 · 다음에 하기'}</td><td><strong>${option?option.score:'—'}</strong><span> / ${Math.max(...item.options.map(o=>o.score))}</span></td></tr>`).join('')}</tbody><tfoot><tr><th colspan="2" scope="row">${s.complete?'총점':'부분 점수'}</th><td>${s.total} / ${a.max}</td></tr></tfoot></table>${state.active==='satisfaction'&&state.comment.trim()?`<section class="result-comment"><h2>건의 및 개선사항</h2><p>${escape(state.comment)}</p></section>`:''}${state.active==='mbi'&&state.mobility==='wheelchair'?'<p class="result-footnote">의자차 점수는 보행 점수를 대체합니다. 기관별 대체 적용 기준을 확인해 주세요.</p>':''}<footer class="result-footer"><span>첨부 협회 공동 서식 기반 · 평가 해석은 담당 전문가의 판단에 따릅니다.</span><span>PTcare · 서버에 저장되지 않는 기록지</span></footer></article><p class="capture-note">휴대폰의 스크롤 캡처 또는 인쇄 / PDF 기능으로 전체 기록지를 보관할 수 있습니다.<br>입력 내용은 새로고침하거나 페이지를 닫으면 사라집니다.</p></main>`;
  document.querySelector('#back').addEventListener('click',()=>{state.result=false;render();window.scrollTo(0,0);});
  document.querySelector('#print').addEventListener('click',()=>window.print());
}
render();
