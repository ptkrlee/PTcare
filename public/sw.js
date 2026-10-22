// This worker deliberately caches no pages, API responses, patient data, or authentication tokens.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification('PTcare 관리자 알림',{
  body:typeof payload.body==='string'?payload.body.slice(0,180):'새 알림이 있습니다. 관리자 화면을 확인하세요.',
  icon:'/icons/icon-192.png',badge:'/icons/badge.png',tag:typeof payload.tag==='string'?payload.tag.slice(0,100):'ptcare-admin',data:{url:'/#/admin'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(window=>new URL(window.url).origin===self.location.origin);
  if(client){await client.navigate('/#/admin');await client.focus();}else await self.clients.openWindow('/#/admin');
 })());
});
