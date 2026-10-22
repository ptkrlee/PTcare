import {timingSafeEqual} from 'node:crypto';
export function secretsEqual(left,right){if(typeof left!=='string'||typeof right!=='string'||!left||!right)return false;const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}
export function validPushEndpoint(endpoint){try{const url=new URL(endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname==='fcm.googleapis.com'||/^(?:[a-z0-9-]+\.)*(?:push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/.test(url.hostname));}catch{return false;}}
export function notificationPayload(job){return {title:'PTcare 관리자 알림',body:job.kind==='signup'?'신규 회원이 가입했습니다. 회원 구분과 인증 요청을 확인하세요.':'새로운 인증 또는 이용권 요청이 있습니다. 관리자 화면에서 확인하세요.',tag:'ptcare-'+job.notification_id,url:'/#/admin'};}
export async function dispatchBatch(client,sendNotification,notificationId=null){
 const {data:jobs,error}=await client.rpc('claim_admin_push_batch',{p_notification_id:notificationId});if(error)throw new Error('Queue unavailable');
 let sent=0,expired=0,retry=0;
 // Bound concurrent provider requests; subscription endpoints and key material never enter logs/responses.
 for(let i=0;i<(jobs||[]).length;i+=5)await Promise.all(jobs.slice(i,i+5).map(async job=>{
  let result='retry',httpStatus=null;
  if(!validPushEndpoint(job.subscription?.endpoint))result='expired';
  else try{const response=await sendNotification(job.subscription,JSON.stringify(notificationPayload(job)),{TTL:3600,urgency:'high',timeout:10000});httpStatus=response?.statusCode||201;result='sent';}catch(error){httpStatus=Number(error.statusCode)||null;if([404,410].includes(httpStatus))result='expired';}
  const {error:ackError}=await client.rpc('complete_admin_push_delivery',{p_id:job.id,p_claim_id:job.claim_id,p_result:result,p_http_status:httpStatus});if(ackError)throw new Error('Delivery acknowledgement failed');
  if(result==='sent')sent++;else if(result==='expired')expired++;else retry++;
 }));
 return {processed:(jobs||[]).length,sent,expired,retry};
}
