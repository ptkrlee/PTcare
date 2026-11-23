import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminMemberHandler} from '../api/admin-member.js';

const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const target='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const email='test@example.test';

function setup({admin=true,targetAdmin=false,confirmed=true,installed=true,authError,serviceError,env={}}={}){
 const mutations=[],connections=[];
 const user={id:target,email,email_confirmed_at:confirmed?'2026-10-01':null};
 const client={
  from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>serviceError?{error:serviceError,status:serviceError.status}:{data:(id===actor?admin:targetAdmin)?{user_id:id}:null}})})}),
  rpc:async()=>installed?{}:{error:{code:'PGRST202'}},
  auth:{
   admin:{
    getUserById:async()=>({data:{user}}),
    deleteUser:async(...args)=>{mutations.push(['delete',...args]);return {};},
   },
   resetPasswordForEmail:async(...args)=>{mutations.push(['reset',...args]);return {};},
   resend:async(...args)=>{mutations.push(['resend',...args]);return {};},
  },
 };
 const userClient={auth:{getUser:async(token)=>({
  data:{user:!authError&&token==='test-admin-token'?{id:actor}:null},
  error:authError,
 })}};
 const handler=createAdminMemberHandler((url,key)=>{
  connections.push([url,key]);
  return key==='test-server-key'?client:userClient;
 },{
  SUPABASE_URL:'https://example.test',
  SUPABASE_SERVICE_ROLE_KEY:'test-server-key',
  VITE_SUPABASE_URL:'https://example.test/',
  VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key',
  ...env,
 });
 return {mutations,connections,request:async(action,body={})=>{
  const result={};
  const res={setHeader:()=>{},status:status=>{result.status=status;return res;},json:json=>{result.json=json;}};
  await handler({method:'POST',headers:{authorization:'Bearer test-admin-token'},body:{userId:target,action,...body}},res);
  return result;
 }};
}

test('member management denies ordinary users, other admins, and self-targeting',async()=>{
 for(const [options,body] of [[{admin:false},{}],[{targetAdmin:true},{}],[{},{userId:actor}]]){
  const {request,mutations}=setup(options);
  assert.equal((await request('reset',body)).status,403);
  assert.deepEqual(mutations,[]);
 }
});

test('admin email recovery uses the target email and server-controlled HTTPS redirect',async()=>{
 const {request,mutations}=setup();
 assert.equal((await request('status')).json.emailConfirmed,true);
 assert.equal((await request('reset',{redirectTo:'https://untrusted.test',email:'wrong@example.test'})).status,200);
 assert.deepEqual(mutations,[['reset',email,{redirectTo:'https://ptcarenote.vercel.app/'}]]);
 const pending=setup({confirmed:false});
 assert.equal((await pending.request('reset')).json.code,'unconfirmed');
 assert.equal((await pending.request('confirm-email')).status,200);
 assert.deepEqual(pending.mutations,[['resend',{type:'signup',email,options:{emailRedirectTo:'https://ptcarenote.vercel.app/'}}]]);
});

test('retirement requires matching confirmation and database guards, and uses soft deletion',async()=>{
 const {request,mutations}=setup();
 assert.equal((await request('retire',{confirmEmail:'wrong@example.test'})).json.code,'confirmation');
 assert.equal((await request('retire',{confirmEmail:email})).status,200);
 assert.deepEqual(mutations,[['delete',target,true]]);
 const oldSchema=setup({installed:false});
 assert.equal((await oldSchema.request('retire',{confirmEmail:email})).json.code,'schema');
 assert.deepEqual(oldSchema.mutations,[]);
});


test('member endpoint separates expired login from public-key, service-key and project settings failures',async()=>{
 const expired=setup({authError:{status:403,code:'session_not_found'}});
 assert.equal((await expired.request('status')).json.code,'login');
 assert.deepEqual(expired.connections,[['https://example.test','test-public-key']]);

 const publicKey=setup({authError:{status:401,message:'Invalid API key'}});
 assert.equal((await publicKey.request('status')).json.code,'browser-key');

 const wrongProject=setup({env:{SUPABASE_URL:'https://other.example.test'}});
 assert.equal((await wrongProject.request('status')).json.code,'project-mismatch');
 assert.deepEqual(wrongProject.connections,[]);

 const copiedPublicKey=setup({env:{SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_wrong'}});
 assert.equal((await copiedPublicKey.request('status')).json.code,'server-key');
 assert.deepEqual(copiedPublicKey.connections,[]);

 const rejectedService=setup({serviceError:{status:401,message:'Invalid API key'}});
 assert.equal((await rejectedService.request('retire',{confirmEmail:email})).json.code,'server-key');
 assert.deepEqual(rejectedService.connections,[['https://example.test','test-public-key'],['https://example.test','test-server-key']]);
 assert.deepEqual(rejectedService.mutations,[]);
});
