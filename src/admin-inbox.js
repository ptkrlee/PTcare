import {supabase} from './backend.js';
import {escape as e} from './icons.js';
import {requestLabels,statusLabels} from './member-account.js';
export async function mountAdminInbox(container,o){
 container.innerHTML='<div class="section-title"><h2>관리자 알림 · 요청함</h2><button class="button secondary compact" id="refresh-inbox">새로고침</button></div><p role="status" id="inbox-status">불러오는 중…</p><h3>신규 가입 · 도착 알림</h3><div id="admin-notifications"></div><h3>인증 · 이용권 요청</h3><div id="admin-requests"></div>';
 const status=container.querySelector('#inbox-status'),notifications=container.querySelector('#admin-notifications'),requests=container.querySelector('#admin-requests');const alive=()=>o.active()&&status.isConnected;let busy=false;const drafts=new Map();
 async function load(){if(busy||!alive())return;busy=true;
  try{const [feed,result]=await Promise.all([supabase.rpc('admin_notifications_feed'),supabase.rpc('admin_access_requests')]);if(!alive())return;if(feed.error||result.error)throw new Error();
   const unread=feed.data.filter(n=>!n.read_at).length,pending=result.data.filter(r=>r.status==='pending').length;status.textContent=`읽지 않은 알림 ${unread}건 · 검토 중 요청 ${pending}건`;
   notifications.innerHTML=feed.data.length?feed.data.map(n=>`<article class="inbox-item ${n.read_at?'':'unread'}"><div><strong>${n.kind==='signup'?'신규 회원가입':e(requestLabels[n.request_kind]||'새 요청')}</strong><p>${e(n.email)} · ${n.member_type==='general'?'일반회원':'치료사회원'}${n.read_at?'':' · 새 알림'}</p><small>${e(new Date(n.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</small></div><button class="button secondary compact" data-open-notification="${n.id}">확인 · 회원 열기</button></article>`).join(''):'<p>아직 도착한 알림이 없습니다.</p>';
   const ordered=[...result.data].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1));
   requests.innerHTML=ordered.length?ordered.map(r=>`<article class="inbox-request" data-request="${r.id}"><strong>${e(r.email)} · ${e(requestLabels[r.kind])}${r.amount?' '+r.amount:''}</strong><span class="request-status">${e(statusLabels[r.status])}</span><p>${e(r.message)}</p><small>${e(new Date(r.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</small>${r.status==='pending'?`<label>처리 메모 · 반려 시 사유 필수<input data-request-note="${r.id}" maxlength="500" value="${e(drafts.get(r.id)||'')}" placeholder="인증 확인 결과 또는 처리 사유"></label><div class="chart-toolbar"><button class="button primary" data-resolve="${r.id}" data-decision="approved">${r.kind==='verification'?'치료사회원 인증 승인':'요청 수량 승인 · 이용권 추가'}</button><button class="button secondary" data-resolve="${r.id}" data-decision="rejected">반려</button></div>`:`<p>관리자 답변: ${e(r.admin_note||'처리 완료')}</p>`}<p role="status" data-request-status="${r.id}"></p></article>`).join(''):'<p>접수된 요청이 없습니다.</p>';
   notifications.querySelectorAll('[data-open-notification]').forEach(button=>button.onclick=async()=>{button.disabled=true;const n=feed.data.find(n=>n.id===button.dataset.openNotification);const {error}=await supabase.rpc('admin_mark_notification_read',{p_id:n.id});if(error){status.textContent='읽음 상태를 저장하지 못했습니다.';button.disabled=false;return;}await o.openMember(n.actor_id);await load();});
   requests.querySelectorAll('[data-request-note]').forEach(input=>input.oninput=()=>drafts.set(input.dataset.requestNote,input.value));
   requests.querySelectorAll('[data-resolve]').forEach(button=>button.onclick=async()=>{
    const id=button.dataset.resolve,note=requests.querySelector(`[data-request-note="${id}"]`).value.trim(),feedback=requests.querySelector(`[data-request-status="${id}"]`);if(button.dataset.decision==='rejected'&&!note){feedback.textContent='반려 사유를 입력해 주세요.';return;}
    requests.querySelectorAll(`[data-resolve="${id}"]`).forEach(b=>b.disabled=true);
    const {error}=await supabase.rpc('admin_resolve_access_request',{p_id:id,p_decision:button.dataset.decision,p_note:note});if(!alive())return;if(error){feedback.textContent='처리하지 못했습니다. 권한·한도·연결을 확인한 뒤 새로고침하세요.';requests.querySelectorAll(`[data-resolve="${id}"]`).forEach(b=>b.disabled=false);return;}
    drafts.delete(id);await o.changed();await load();
   });
  }catch{if(alive())status.textContent='요청함을 불러오지 못했습니다. 최신 데이터베이스 설정과 연결을 확인해 주세요.';}finally{busy=false;}
 }
 container.querySelector('#refresh-inbox').onclick=()=>load();
 const timer=setInterval(()=>{if(!alive()){clearInterval(timer);return;}if(!document.hidden&&!container.querySelector('input:focus')&&!container.querySelector('[data-resolve]:disabled'))load();},30000);
 await load();
}
