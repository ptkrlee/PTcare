import test from 'node:test';
import assert from 'node:assert/strict';
import {secretsEqual,validPushEndpoint,notificationPayload,dispatchBatch} from '../server/push.js';
import configHandler from '../api/push-config.js';
test('push transport uses only real HTTPS push providers and constant-time secret comparison',()=>{
 for(const endpoint of ['https://web.push.apple.com/abc','https://fcm.googleapis.com/fcm/send/abc','https://updates.push.services.mozilla.com/wpush/v2/abc'])assert.equal(validPushEndpoint(endpoint),true);
 for(const endpoint of ['https://127.0.0.1/a','http://web.push.apple.com/a','https://web.push.apple.com.attacker.test/a','https://user:pass@web.push.apple.com/a','https://localhost/a','https://evilpush.apple.com/a'])assert.equal(validPushEndpoint(endpoint),false);
 assert.equal(secretsEqual('a'.repeat(32),'a'.repeat(32)),true);assert.equal(secretsEqual('a'.repeat(32),'a'.repeat(31)),false);assert.equal(secretsEqual('',''),false);
 const payload=notificationPayload({kind:'signup',notification_id:'id',email:'private@example.test',patient:'가상 대상자',url:'https://attacker.test'});assert.equal(payload.url,'/#/admin');assert.doesNotMatch(JSON.stringify(payload),/private|가상 대상자|attacker/);
});
test('successful, expired and retryable pushes are acknowledged without returning endpoints or key material',async()=>{
 const calls=[];const jobs=[{id:'1',claim_id:'a',notification_id:'n',kind:'signup',subscription:{endpoint:'https://web.push.apple.com/one'}},{id:'2',claim_id:'b',notification_id:'n',kind:'request',subscription:{endpoint:'https://web.push.apple.com/two'}},{id:'3',claim_id:'c',notification_id:'n',kind:'request',subscription:{endpoint:'https://fcm.googleapis.com/three'}}];
 const client={async rpc(name,args){calls.push({name,args});return name==='claim_admin_push_batch'?{data:jobs}:{data:null};}};
 const result=await dispatchBatch(client,async sub=>{if(sub.endpoint.endsWith('two'))throw {statusCode:410};if(sub.endpoint.endsWith('three'))throw {statusCode:503};return {statusCode:201};});
 assert.deepEqual(result,{processed:3,sent:1,expired:1,retry:1});assert.deepEqual(calls.filter(c=>c.name==='complete_admin_push_delivery').map(c=>c.args.p_result),['sent','expired','retry']);assert.doesNotMatch(JSON.stringify(result),/endpoint|subscription|claim/);
});
test('failed delivery acknowledgements surface an error so the durable lease can be recovered',async()=>{
 const client={async rpc(name){return name==='claim_admin_push_batch'?{data:[{id:'1',claim_id:'a',subscription:{endpoint:'https://web.push.apple.com/one'}}]}:{error:{message:'offline'}};}};
 await assert.rejects(dispatchBatch(client,async()=>({statusCode:201})),/acknowledgement/);
});
test('public push config never exposes server secrets',()=>{
 const before={...process.env};Object.assign(process.env,{VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private-secret',VAPID_SUBJECT:'mailto:admin@example.test',SUPABASE_URL:'https://example.test',SUPABASE_SERVICE_ROLE_KEY:'service-secret',PUSH_WEBHOOK_SECRET:'webhook-secret'});
 let response;const res={setHeader(){},status(status){this.statusCode=status;return this;},json(data){response=data;}};try{configHandler({method:'GET'},res);assert.deepEqual(response,{configured:true,publicKey:'public'});assert.doesNotMatch(JSON.stringify(response),/private|service-secret|webhook/);}finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before);}
});
