import {mountPushKeySetup} from './push-key-setup.js';
import {supabase} from './backend.js';
export const workerReady='serviceWorker' in navigator?navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).catch(()=>null):Promise.resolve(null);
export function iosNeedsInstall(){return (/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))&&!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone;}
function applicationKey(value){const bytes=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));return Uint8Array.from(bytes,char=>char.charCodeAt(0));}
export async function mountAdminPush(container,isActive){
 container.innerHTML=`<h2>아이폰 · 이 기기 알림</h2><p>아이폰은 iOS 16.4 이상에서 Safari의 공유 → <strong>홈 화면에 추가</strong> → 추가한 PTcare 아이콘으로 실행한 뒤 알림을 켜세요.</p><p class="helper">알림에는 신규 가입·요청 도착만 표시합니다. 이름과 대상자 정보는 잠금 화면에 보내지 않습니다. 이 기기에서 알림을 끄기 전까지는 앱을 닫아도 알림을 받을 수 있습니다.</p><div class="chart-toolbar"><button class="button primary" id="enable-admin-push" disabled>이 기기 알림 켜기</button><button class="button secondary" id="disable-admin-push" disabled>이 기기 알림 끄기</button><button class="button secondary" id="retry-admin-push" disabled>서버 알림 발송 재시도</button></div><p role="status" id="push-status">알림 설정을 확인하는 중…</p><div data-push-key-setup></div>`;
 mountPushKeySetup(container.querySelector('[data-push-key-setup]'));
 const status=container.querySelector('#push-status'),enable=container.querySelector('#enable-admin-push'),disable=container.querySelector('#disable-admin-push'),retry=container.querySelector('#retry-admin-push');const alive=()=>isActive()&&status.isConnected;
 if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator)){status.textContent='이 브라우저는 웹 푸시를 지원하지 않습니다. 아이폰은 iOS 16.4 이상에서 홈 화면에 추가한 PTcare를 실행하세요.';disable.disabled=true;retry.disabled=true;return;}
 if(iosNeedsInstall()){status.textContent='Safari 공유 버튼에서 홈 화면에 추가한 후 PTcare 아이콘으로 다시 실행하세요.';disable.disabled=true;return;}
 let config;try{const response=await fetch('/api/push-config',{cache:'no-store'});if(!response.ok)throw new Error();config=await response.json();if(!config.configured)throw new Error();}catch{if(alive())status.textContent='서버 알림 설정이 아직 완료되지 않았습니다. 관리자 설정 안내에 따라 발송 환경 변수를 등록해 주세요.';return;}if(!alive())return;
 const registration=await workerReady;if(!registration){status.textContent='알림 서비스를 시작하지 못했습니다. 새로고침 후 다시 확인하세요.';return;}
 enable.disabled=false;disable.disabled=false;retry.disabled=false;
 try{const sub=await registration.pushManager.getSubscription();if(sub){const {data,error}=await supabase.rpc('admin_has_push_subscription',{p_endpoint:sub.endpoint});status.textContent=!error&&data?'이 기기 알림이 켜져 있습니다.':'이 기기 알림의 서버 등록이 필요합니다. 알림 켜기를 눌러 주세요.';}else status.textContent=Notification.permission==='denied'?'아이폰 설정 → 알림 → PTcare에서 알림 허용을 켜주세요.':'알림 켜기를 눌러 알림 수신을 허용하세요.';}catch{status.textContent='알림 상태를 확인하지 못했습니다. 다시 등록해 주세요.';}
 enable.onclick=async()=>{
  enable.disabled=true;
  try{const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent='알림이 허용되지 않았습니다. 아이폰 설정 → 알림 → PTcare에서 허용해 주세요.';return;}
   let subscription=await registration.pushManager.getSubscription();const key=applicationKey(config.publicKey);
   if(subscription?.options.applicationServerKey&&String(new Uint8Array(subscription.options.applicationServerKey))!==String(key)){await subscription.unsubscribe();subscription=null;}
   subscription||=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   const {error}=await supabase.rpc('admin_save_push_subscription',{p_subscription:subscription.toJSON(),p_device_label:/iPhone/.test(navigator.userAgent)?'iPhone':navigator.platform||'브라우저'});if(error)throw new Error();
   if(alive())status.textContent='이 기기 알림 등록을 완료했습니다. 신규 가입·요청이 도착하면 알림을 받습니다.';
  }catch{if(alive())status.textContent='알림을 등록하지 못했습니다. 홈 화면 실행·알림 권한·서버 설정을 확인해 주세요.';}finally{if(alive())enable.disabled=false;}
 };
 disable.onclick=async()=>{disable.disabled=true;try{const sub=await registration.pushManager.getSubscription();if(sub){await sub.unsubscribe();const {error}=await supabase.rpc('admin_remove_push_subscription',{p_endpoint:sub.endpoint});if(error)throw new Error();}status.textContent='이 기기 알림을 껐습니다.';}catch{status.textContent='기기 알림 해제 또는 서버 등록 정리를 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.';}finally{if(alive())disable.disabled=false;}};
 retry.onclick=async()=>{retry.disabled=true;try{const {data}=await supabase.auth.getSession();const response=await fetch('/api/admin-push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:'{}'});if(!response.ok)throw new Error();const result=await response.json();status.textContent=`발송 대기 확인 완료 · ${result.sent}건 전송. 도착 여부는 기기의 알림 설정과 네트워크 상태에 따라 달라집니다.`;}catch{status.textContent='서버 발송을 완료하지 못했습니다. 요청 목록은 유지되며 서버 발송 설정을 확인해야 합니다.';}finally{if(alive())retry.disabled=false;}};
}
