import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mockCloud,login,patient} from './mock-cloud.js';
import {assessmentOrder} from '../../src/data.js';

const aligned=async page=>{
 const bad=await page.locator('.result-sheet th,.result-sheet td,.result-title,.result-person dd,.result-comment p,.result-measurements dd,.result-score>div:last-child').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).textAlign!=='left').map(n=>({text:n.textContent,align:getComputedStyle(n).textAlign})));
 expect(bad).toEqual([]);
};
test('every assessment result stays left aligned on screen and A4 print, including central ROM and MoCA scores',async({page,context})=>{
 test.setTimeout(90000);
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);
 const assessmentURL=page.url().replace(/\/bbs$/, '');
 await page.locator('[data-tab=rom]').click();await page.locator('#rom-regions-0').check();
 await page.locator('#rom-neck-flex-center').getByRole('radio',{name:'Limited',exact:true}).check();await page.locator('#rom-neck-flex-center-degrees').fill('35');
 await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 for(const key of assessmentOrder){
  await page.goto(assessmentURL+'/'+key+'/result');await expect(page.locator('.result-sheet')).toBeVisible();
  await aligned(page);await page.setViewportSize({width:390,height:844});await aligned(page);await page.setViewportSize({width:1280,height:900});
  await page.emulateMedia({media:'print'});await aligned(page);
  const path='/tmp/ptcare-review-'+key+'.pdf';await page.pdf({path,format:'A4',preferCSSPageSize:true});
  expect(execFileSync('pdfinfo',[path],{encoding:'utf8'})).toMatch(/Pages:\s+1\b/);
  if(key==='rom')await page.screenshot({path:'/tmp/ptcare-review-rom-print.png',fullPage:true});
  await page.emulateMedia({media:'screen'});
  if(key==='rom')await page.screenshot({path:'/tmp/ptcare-review-rom-screen.png',fullPage:true});
 }
 await page.goto(assessmentURL.replace(/\/assessments$/,'/charting/print-service'));
 await expect(page.locator('.service-print .result-footer')).toHaveText('입력 및 실시 확인 내용으로 작성했습니다.');
 await page.screenshot({path:'/tmp/ptcare-review-service-screen.png',fullPage:true});
 await page.pdf({path:'/tmp/ptcare-review-service.pdf',format:'A4',preferCSSPageSize:true});
 const text=execFileSync('pdftotext',['/tmp/ptcare-review-service.pdf','-'],{encoding:'utf8'});
 expect(text).toContain('입력 및 실시 확인 내용으로 작성했습니다.');expect(text).not.toContain('기능 향상을 자동 판정');expect(text).not.toContain('통영권 침상운동');
});

test('new general and pending therapist members can log in after signup and reach temporary assessments',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);
 for(const type of ['general','therapist']){
  await page.goto('/');await page.locator('#switch-auth').click();await page.locator('#signup-member-type').selectOption(type);
  const email='new-'+type+'@example.test';await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('test-password-only');await page.locator('#auth-form button').click();await expect(page.locator('.auth-message')).toContainText('가입 확인 메일');
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('test-password-only');await page.locator('#auth-form button').click();await expect(page.locator('#temporary-patient-form')).toBeVisible();await expect(page.locator('.temporary-mode')).toContainText('저장 없음');
  await page.locator('#logout').click();await expect(page.locator('#auth-form')).toBeVisible();
 }
});

test('unconfirmed email has an explicit login message and password reset uses the current origin',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);
 await context.route('**/auth/v1/token*',r=>r.fulfill({status:400,json:{error_code:'email_not_confirmed',msg:'Email not confirmed'}}));
 let redirect;await context.route('**/auth/v1/recover*',r=>{redirect=new URL(r.request().url()).searchParams.get('redirect_to');return r.fulfill({json:{}});});
 await page.goto('/');await page.locator('#auth-email').fill('new@example.test');await page.locator('#auth-password').fill('test-password-only');await page.locator('#auth-form button').click();await expect(page.locator('.auth-message')).toContainText('이메일 인증이 필요');
 await page.locator('#reset-password').click();await expect(page.locator('.auth-message')).toContainText('재설정 메일이 발송');expect(redirect).toBe(new URL(page.url()).origin);
});

test('recovery link allows a new password even while member access is unavailable, and logout clears recovery mode',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);const id='11111111-1111-4111-8111-111111111111',email='therapist@example.test';
 const user={id,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
 let password;
 await context.route('**/auth/v1/user',r=>{if(r.request().method()==='PUT')password=r.request().postDataJSON().password;return r.fulfill({json:user});});
 await context.route('**/rpc/my_access',async r=>{await new Promise(resolve=>setTimeout(resolve,2500));await r.fulfill({status:503,json:{message:'unavailable'}});});
 const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const token=b64({alg:'HS256'})+'.'+b64({sub:id,exp:Math.floor(Date.now()/1000)+3600})+'.mock';
 await page.goto('/#access_token='+token+'&refresh_token=mock&expires_in=3600&token_type=bearer&type=recovery');
 await expect(page.locator('#new-password')).toBeVisible({timeout:2000});await page.locator('#new-password').fill('replacement-password-only');await page.locator('#password-form button').click();await expect(page.locator('#password-form')).toHaveCount(0);expect(password).toBe('replacement-password-only');
 await page.locator('#logout').click();await expect(page.locator('#auth-form')).toBeVisible();
});

test('admin reads structured ROM and SPPB time ranges without changing the therapist record',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);
 await page.locator('[data-tab=rom]').click();await page.locator('#rom-regions-2').check();
 await page.locator('#rom-shoulder-flex-right').getByRole('radio',{name:'Full',exact:true}).check();
 await page.locator('#rom-shoulder-flex-left').getByRole('radio',{name:'Limited',exact:true}).check();await page.locator('#rom-shoulder-flex-left-degrees').fill('115');await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 const row=[...cloud.rows.values()][0];row.document.visits[0].forms.sppb={answers:{},fields:{'sppb-chair-time-criterion':'range-3'}};row.revision++;
 const before=JSON.stringify(row);await page.locator('#logout').click();await login(page,'admin@example.test');await page.getByRole('link',{name:'관리자',exact:true}).click();await page.locator('[data-admin-user="11111111-1111-4111-8111-111111111111"]').click();
 await page.locator('.admin-record > summary').click();await page.locator('.admin-record > details').first().locator(':scope > summary').click();
 const rom=page.locator('.admin-assessment').filter({has:page.locator('.clinical-result-table')});await rom.locator('summary').click();await expect(rom.locator('.clinical-result-table')).toContainText('Limited 115°');
 await expect(page.locator('#admin-detail')).toContainText('11.20–13.69초 · 3점');expect(JSON.stringify([...cloud.rows.values()][0])).toBe(before);
 await page.screenshot({path:'/tmp/ptcare-review-admin.png',fullPage:true});
});
