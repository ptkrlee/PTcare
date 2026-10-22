// First-install helper: key material is created in the admin's browser only, never sent or stored.
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function mountPushKeySetup(container){
 container.innerHTML='<details class="push-key-setup"><summary>최초 서버 알림 설정 · 키 생성</summary><p>여기서 만든 값을 Vercel의 서버 환경 변수에 등록하세요. 값은 이 화면을 떠나면 사라집니다. 기존 키를 교체하면 기기 알림을 다시 등록해야 합니다.</p><a class="text-button" href="https://github.com/ptkrlee/PTcare/blob/main/docs/MOBILE-NOTIFICATIONS.md" target="_blank" rel="noopener">단계별 서버·아이폰 설정 안내</a><p><button type="button" class="button secondary" id="generate-push-keys">최초 설정용 키 생성</button></p><div id="generated-push-keys"></div><p role="status" id="push-key-status"></p></details>';
 const button=container.querySelector('#generate-push-keys'),status=container.querySelector('#push-key-status'),fields=container.querySelector('#generated-push-keys');
 button.onclick=async()=>{button.disabled=true;try{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const publicKey=b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),privateKey=(await crypto.subtle.exportKey('jwk',pair.privateKey)).d,secret=b64(crypto.getRandomValues(new Uint8Array(32)));
  const entries=[['VAPID_PUBLIC_KEY',publicKey,false],['VAPID_PRIVATE_KEY',privateKey,true],['PUSH_WEBHOOK_SECRET',secret,true]];
  fields.innerHTML=entries.map(([key,value,privateValue])=>`<label>${key}<input readonly autocomplete="off" spellcheck="false" type="${privateValue?'password':'text'}" data-generated-key="${key}" value="${value}"></label><button type="button" class="text-button" data-copy-key="${key}">${key} 복사</button>`).join('');
  fields.querySelectorAll('[data-copy-key]').forEach(copy=>copy.onclick=async()=>{const input=fields.querySelector(`[data-generated-key="${copy.dataset.copyKey}"]`);try{await navigator.clipboard.writeText(input.value);status.textContent=copy.dataset.copyKey+' 값을 복사했습니다. Vercel 환경 변수에 붙여넣으세요.';}catch{input.focus();input.select();status.textContent='입력란의 선택된 값을 직접 복사하세요.';}});status.textContent='키를 생성했습니다. 비밀 값은 서버 환경 변수에만 등록하고 채팅·공개 코드에 올리지 마세요.';
 }catch{status.textContent='키를 생성하지 못했습니다. HTTPS 연결과 브라우저 지원 여부를 확인하세요.';}finally{button.disabled=false;}};
}
