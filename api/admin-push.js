import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';
import {dispatchBatch,secretsEqual} from '../server/push.js';
export const config={maxDuration:60};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const env=process.env;
 if(![env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY,env.VAPID_SUBJECT,env.PUSH_WEBHOOK_SECRET].every(Boolean))return res.status(503).json({error:'Push service not configured'});
 const bearer=req.headers.authorization?.replace(/^Bearer /,'')||'';
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 if(!secretsEqual(bearer,env.PUSH_WEBHOOK_SECRET)){
  if(!bearer)return res.status(401).json({error:'Authentication required'});
  const {data,error}=await client.auth.getUser(bearer);if(error||!data.user)return res.status(401).json({error:'Authentication required'});
  const {data:admin,error:adminError}=await client.from('platform_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();if(adminError||!admin)return res.status(403).json({error:'Admin required'});
 }
 try{
  let body=req.body||{};if(typeof body==='string'){if(body.length>10000)return res.status(413).json({error:'Request too large'});body=JSON.parse(body);}
  const notificationId=body.record?.id||body.notification_id||null;
  if(notificationId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId))return res.status(400).json({error:'Invalid notification'});
  webpush.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);
  const result=await dispatchBatch(client,webpush.sendNotification.bind(webpush),notificationId);
  // Non-success lets webhooks/monitoring detect transient provider failures. Retries remain durable.
  return res.status(result.retry?503:200).json(result);
 }catch{return res.status(503).json({error:'Push dispatch unavailable; notifications remain in the inbox'});}
}
