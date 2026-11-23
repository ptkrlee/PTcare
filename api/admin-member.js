import {createClient} from '@supabase/supabase-js';

const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const actions=new Set(['status','reset','confirm-email','retire']);

export function createAdminMemberHandler(connect=createClient,env=process.env){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const deadline=AbortSignal.timeout(9000);
  const fail=(status,code)=>deadline.aborted?res.status(504).json({code:'timeout'}):res.status(status).json({code});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'method');}
  const bearer=req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
  if(!bearer)return fail(401,'login');
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return fail(503,'config');
  let body=req.body;
  if(typeof body==='string'){
   if(body.length>4096)return fail(413,'input');
   try{body=JSON.parse(body);}catch{return fail(400,'input');}
  }
  if(typeof body?.userId!=='string'||!uuid.test(body.userId)||!actions.has(body.action))return fail(400,'input');
  try{
   const client=connect(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,deadline]):deadline})},
   });
   const {data:{user:actor},error:authError}=await client.auth.getUser(bearer);
   if(authError||!actor)return fail(401,'login');
   const admin=id=>client.from('platform_admins').select('user_id').eq('user_id',id).maybeSingle();
   const {data:isAdmin,error:adminError}=await admin(actor.id);
   if(adminError)return fail(503,'unavailable');
   if(!isAdmin)return fail(403,'forbidden');
   if(body.userId.toLowerCase()===actor.id.toLowerCase())return fail(403,'protected');
   const {data:targetAdmin,error:targetError}=await admin(body.userId);
   if(targetError)return fail(503,'unavailable');
   if(targetAdmin)return fail(403,'protected');
   const {data:{user:target},error:lookupError}=await client.auth.admin.getUserById(body.userId);
   if(lookupError&&lookupError.status!==404)return fail(503,'unavailable');
   if(!target?.email)return fail(404,'missing');
   const state={
    emailConfirmed:!!target.email_confirmed_at,
    lastSignIn:target.last_sign_in_at||null,
    suspended:Date.parse(target.banned_until)>Date.now(),
    retired:!!target.deleted_at,
   };
   if(body.action==='status')return res.status(200).json(state);
   if(state.retired)return fail(409,'retired');
   if(body.action==='retire'){
    if(body.confirmEmail!==target.email)return fail(400,'confirmation');
    const {error:schemaError}=await client.rpc('member_session_active');
    if(schemaError)return fail(503,'schema');
    const {error}=await client.auth.admin.deleteUser(target.id,true);
    if(error)return fail(503,'retire-failed');
    return res.status(200).json({ok:true});
   }
   if(state.suspended)return fail(409,'suspended');
   if(body.action==='reset'&&!state.emailConfirmed)return fail(409,'unconfirmed');
   if(body.action==='confirm-email'&&state.emailConfirmed)return fail(409,'confirmed');
   // Use the configured canonical recovery URL. Never accept redirects from requests.
   const redirect=env.PTCARE_PASSWORD_RESET_URL||'https://ptcarenote.vercel.app/';
   let url;
   try{url=new URL(redirect);}catch{return fail(503,'config');}
   if(url.protocol!=='https:'||url.username||url.password)return fail(503,'config');
   const result=body.action==='reset'
    ?await client.auth.resetPasswordForEmail(target.email,{redirectTo:url.href})
    :await client.auth.resend({type:'signup',email:target.email,options:{emailRedirectTo:url.href}});
   if(result.error)return fail(result.error.status===429?429:503,'email-failed');
   return res.status(200).json({ok:true});
  }catch{return fail(503,'unavailable');}
 };
}

export default createAdminMemberHandler();
