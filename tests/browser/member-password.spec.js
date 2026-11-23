import {expect,test} from '@playwright/test';
import {login,mockCloud} from './mock-cloud.js';

test('therapist changes their own password only after checking the current password',async({page,context})=>{
 await mockCloud().attach(context);
 const updateCalls=[];
 await page.route('**/auth/v1/token?grant_type=password',async route=>{
  if(route.request().method()!=='POST')return route.fallback();
  const {password}=route.request().postDataJSON();
  if(password!=='test-password-only')return route.fulfill({
   status:400,json:{code:'invalid_credentials',error_code:'invalid_credentials',msg:'Invalid login credentials'},
   headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},
  });
  await route.fallback();
 });
 await page.route('**/auth/v1/user',async route=>{
  if(route.request().method()!=='PUT')return route.fallback();
  updateCalls.push(route.request().postDataJSON());
  const jwt=route.request().headers().authorization.split(' ')[1];
  const {sub}=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString());
  expect(sub).toBe('11111111-1111-4111-8111-111111111111');
  await route.fulfill({
   json:{id:sub,email:'therapist@example.test',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{}},
   headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},
  });
 });

 await login(page);
 await page.getByRole('link',{name:'회원정보 · 요청'}).click();
 const form=page.locator('#member-password-form');
 const message=form.getByRole('status');
 await form.getByLabel('현재 비밀번호',{exact:true}).fill('wrong-password-only');
 await form.getByLabel('새 비밀번호',{exact:true}).fill('new-therapist-password');
 await form.getByLabel('새 비밀번호 확인',{exact:true}).fill('different-password');
 await form.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
 await expect(message).toHaveText('새 비밀번호 확인이 일치하지 않습니다.');
 await form.getByLabel('새 비밀번호 확인',{exact:true}).fill('new-therapist-password');
 await form.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
 await expect(message).toHaveText('현재 비밀번호가 올바르지 않습니다.');
 expect(updateCalls).toEqual([]);

 await form.getByLabel('현재 비밀번호',{exact:true}).fill('test-password-only');
 await form.getByRole('button',{name:'비밀번호 변경',exact:true}).click();
 await expect(message).toHaveText('비밀번호를 변경했습니다.');
 await expect(form.getByLabel('현재 비밀번호',{exact:true})).toHaveValue('');
 expect(updateCalls).toMatchObject([{password:'new-therapist-password'}]);
 await expect(page.getByRole('button',{name:'로그아웃'})).toBeVisible();
});
