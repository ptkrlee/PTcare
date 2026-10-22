export function mockCloud(){
 const rows=new Map();let offline=false;
 const owners={'therapist@example.test':'11111111-1111-4111-8111-111111111111','other@example.test':'22222222-2222-4222-8222-222222222222'};
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const token=id=>`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock_signature`;
 const clone=v=>JSON.parse(JSON.stringify(v));
 return {rows,setOffline:v=>offline=v,async attach(context){await context.route('https://ptcare-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(offline){await route.abort('internetdisconnected');return;}
  const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return reply({});
  const body=req.postDataJSON?.();
  if(url.pathname==='/auth/v1/token'){
   const email=body.email||'therapist@example.test',id=owners[email];if(!id)return reply({msg:'Invalid login'},400);
   return reply({access_token:token(id),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'mock_refresh_'+id,user:{id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'}});
  }
  if(url.pathname==='/auth/v1/logout')return reply({});
  const auth=req.headers().authorization||'';let owner;try{owner=JSON.parse(Buffer.from(auth.split('.')[1],'base64url').toString()).sub;}catch{return reply({message:'Unauthorized'},401);}
  if(url.pathname==='/rest/v1/patient_records')return reply(clone([...rows.values()].filter(row=>row.owner_id===owner)));
  if(url.pathname==='/rest/v1/rpc/save_patient_record'){
   const old=rows.get(body.p_id);
   if(old&&old.owner_id!==owner)return reply({code:'42501',message:'Forbidden'},403);
   if(old?.last_change_id===body.p_change_id)return reply([clone(old)]);
   if((old?.revision||0)!==body.p_expected_revision)return reply({code:'40001',message:'Conflict'},409);
   const row={id:body.p_id,owner_id:owner,document:body.p_document,revision:(old?.revision||0)+1,last_change_id:body.p_change_id,updated_at:new Date().toISOString()};rows.set(row.id,clone(row));return reply([clone(row)]);
  }
  return reply({message:'Unknown mocked endpoint '+url.pathname},404);
 });}};
}
export async function login(page,email='therapist@example.test'){
 await page.goto('/');await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('test-password-only');await page.locator('#auth-form button').click();await page.locator('#new-patient:not([disabled])').waitFor();
}
export async function patient(page,name='홍길동'){
 await page.locator('#new-patient').click();await page.locator('#patient-form [name=name]').fill(name);await page.locator('#patient-form [name=birth]').fill('1950-03-15');await page.locator('#patient-form button[type=submit]').click();await page.locator('.evaluation-card').first().waitFor();await page.locator('.evaluation-card').first().click();await page.locator('#bbs-0').waitFor();
}
