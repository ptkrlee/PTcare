import {escape as e} from './icons.js';

const messages={
 login:'관리자로 다시 로그인해 주세요.',
 forbidden:'관리자만 계정을 관리할 수 있습니다.',
 protected:'본인 계정과 다른 관리자 계정은 여기에서 변경할 수 없습니다.',
 missing:'인증 서버에서 회원 계정을 찾지 못했습니다.',
 config:'Vercel의 관리자 계정 관리 설정을 확인해 주세요.',
 'project-mismatch':'Vercel의 SUPABASE_URL이 PTcare 로그인에 사용하는 Supabase 프로젝트 주소와 다릅니다.',
 'browser-key':'PTcare 로그인용 Supabase 공개 키를 인증 서버에서 확인하지 못했습니다.',
 'server-key':'Supabase 서버 키 또는 관리자 조회 권한을 확인해 주세요. Vercel Production의 SUPABASE_SERVICE_ROLE_KEY 설정을 확인하세요.',
 unavailable:'Supabase 인증 서버에서 결과를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
 schema:'Supabase에 최신 스키마를 적용한 후 탈퇴를 처리할 수 있습니다.',
 suspended:'로그인이 제한된 계정입니다. 인증 서버의 계정 상태를 확인하세요.',
 retired:'이미 탈퇴 처리된 계정입니다.',
 unconfirmed:'이메일 인증 전입니다. 가입 확인 메일을 먼저 보내 주세요.',
 confirmed:'이미 이메일 인증을 완료한 계정입니다.',
 confirmation:'회원 이메일을 정확히 입력해 주세요.',
 'email-failed':'메일을 보내지 못했습니다. 발송 한도와 Supabase 메일 설정을 확인해 주세요.',
 'retire-failed':'탈퇴를 완료하지 못했습니다. 계정 상태와 Supabase 로그를 확인해 주세요.',
};

export function mountAdminMember(container,{member,active,getAccessToken,loginStatus,loadLoginStatus,onRetired}){
 if(member.deleted_at){
  loginStatus.textContent='로그인 · 탈퇴 처리됨';
  container.innerHTML='<h2>계정 관리</h2><p>탈퇴 처리됨 · 기존 기록 열람 가능</p>';
  return;
 }
 container.innerHTML=`<h2>계정 관리</h2>
 <div class="dialog-actions">
  <button type="button" class="button secondary" data-inline-action data-member-action="status">로그인 상태 확인</button>
  <button type="button" class="button secondary" data-inline-action data-member-action="reset">비밀번호 재설정 메일 보내기</button>
  <button type="button" class="button secondary" data-inline-action data-member-action="confirm-email">가입 확인 메일 다시 보내기</button>
 </div>
 <details><summary>계정 탈퇴</summary>
  <p>탈퇴하면 이 계정으로 다시 로그인할 수 없습니다. 기존 임상 기록과 관리 이력은 보존됩니다.</p>
  <form id="retire-member-form" data-inline-action>
   <label>확인용 이메일 (${e(member.email)})<input name="confirmEmail" type="email" required autocomplete="off" spellcheck="false"></label>
   <button class="button secondary" type="submit">계정 탈퇴 확정</button>
  </form>
 </details><p role="status" data-member-status></p>`;
 const status=container.querySelector('[data-member-status]');
 const statusButton=container.querySelector('[data-member-action="status"]');
 const buttons=[...container.querySelectorAll('button')].filter(button=>button!==statusButton);
 const formatDate=value=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
 const refreshLoginStatus=async()=>{
  if(!active()||statusButton.disabled)return;
  statusButton.disabled=true;
  loginStatus.textContent='이메일 인증 상태 확인 중…';
  const controller=new AbortController();
  let timer;
  try{
   const timeout=new Promise(resolve=>{
    timer=setTimeout(()=>{controller.abort();resolve({timeout:true});},12000);
   });
   const {data,error,timeout:timedOut}=await Promise.race([loadLoginStatus(controller.signal),timeout]);
   if(!active())return;
   if(timedOut||controller.signal.aborted){
    loginStatus.textContent='이메일 인증 상태를 확인하지 못했습니다. 조회 시간이 초과됐습니다.';
   }else if(error){
    loginStatus.textContent=['PGRST202','42883'].includes(error.code)
     ?'이메일 인증 조회를 사용하려면 Supabase에 관리자 조회 SQL을 적용해 주세요.'
     :'이메일 인증 상태를 확인하지 못했습니다. 관리자 권한과 연결을 확인해 주세요.';
   }else if(!data){
    loginStatus.textContent='인증 서버에서 회원 계정을 찾지 못했습니다.';
   }else{
    const email=data.emailConfirmedAt?'이메일 인증 완료 ('+formatDate(data.emailConfirmedAt)+')':'이메일 인증 대기';
    const login=data.retired?'탈퇴 처리됨':data.suspended?'제한 중':'제한 없음';
    loginStatus.textContent=`${email} · 로그인 ${login} · 마지막 로그인 ${data.lastSignIn?formatDate(data.lastSignIn):'기록 없음'}`;
   }
  }catch{
   if(active())loginStatus.textContent='이메일 인증 상태를 확인하지 못했습니다. 서버 연결을 확인해 주세요.';
  }finally{
   clearTimeout(timer);
   if(active())statusButton.disabled=false;
  }
 };
 const run=async(action,confirmEmail)=>{
  if(!active()||buttons.some(button=>button.disabled))return;
  buttons.forEach(button=>button.disabled=true);
  status.textContent='처리 중…';
  const signal=AbortSignal.timeout(12000);
  const timeoutMessage='서버 응답이 지연되어 결과를 확인하지 못했습니다. 처리 여부를 확인한 뒤 다시 시도해 주세요.';
  try{
   const token=getAccessToken();
   if(!token){status.textContent=messages.login;return;}
   const response=await fetch('/api/admin-member',{
    method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({userId:member.user_id,action,confirmEmail}),
   });
   const payload=await response.json().catch(error=>{if(signal.aborted)throw error;return null;});
   if(!active())return;
   if(response.status===504||payload?.code==='timeout'){
    status.textContent=timeoutMessage;
    return;
   }
   if(!payload){status.textContent='계정 관리 서버의 응답을 읽지 못했습니다. 운영 배포 상태를 확인해 주세요.';return;}
   if(!response.ok){status.textContent=messages[payload.code]||'계정 작업을 완료하지 못했습니다. 다시 시도해 주세요.';return;}
   if(action==='retire'){
    status.textContent='계정 탈퇴를 처리했습니다.';
    await onRetired();
   }else status.textContent=action==='reset'?'비밀번호 재설정 메일을 요청했습니다.':'가입 확인 메일을 다시 요청했습니다.';
  }catch{
   if(!active())return;
   status.textContent=signal.aborted
    ?timeoutMessage
    :'계정 작업을 완료하지 못했습니다. 서버 연결을 확인해 주세요.';
  }finally{
   if(active())buttons.forEach(button=>button.disabled=false);
  }
 };
 statusButton.onclick=refreshLoginStatus;
 container.querySelectorAll('[data-member-action]:not([data-member-action="status"])').forEach(button=>button.onclick=()=>run(button.dataset.memberAction));
 refreshLoginStatus();
 container.querySelector('#retire-member-form').onsubmit=event=>{
  event.preventDefault();
  const confirmEmail=event.currentTarget.elements.confirmEmail.value.trim();
  if(confirmEmail!==member.email){status.textContent=messages.confirmation;return;}
  run('retire',confirmEmail);
 };
}
