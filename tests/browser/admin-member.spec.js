import {expect,test} from '@playwright/test';
import {login,mockCloud} from './mock-cloud.js';

test('admin verifies account status, requests reset, and confirms retirement by email',async({page,context})=>{
 const cloud=mockCloud();
 const member=[...cloud.access.values()].find(row=>row.email==='other@example.test');
 await cloud.attach(context);
 const actions=[];
 await page.route('**/api/admin-member',async route=>{
  const body=route.request().postDataJSON();
  expect(body.userId).toBe(member.user_id);
  expect(route.request().headers().authorization).toMatch(/^Bearer /);
  actions.push(body.action);
  if(body.action==='retire'){
   expect(body.confirmEmail).toBe(member.email);
   member.deleted_at=new Date().toISOString();
  }
  const json=body.action==='status'?{emailConfirmed:true,lastSignIn:null,suspended:false,retired:false}:{ok:true};
  await route.fulfill({json});
 });

 await login(page,'admin@example.test');
 await page.getByRole('link',{name:'관리자',exact:true}).click();
 await page.locator('#admin-search').fill(member.email);
 await page.getByRole('button',{name:'이용권 관리 · 기록 열람'}).click();
 await page.getByRole('button',{name:'로그인 상태 확인'}).click();
 const account=page.locator('#admin-member-auth');
 await expect(account).toContainText('이메일 인증 완료');
 await page.getByRole('button',{name:'비밀번호 재설정 메일 보내기'}).click();
 await expect(account).toContainText('비밀번호 재설정 메일을 요청했습니다.');

 await account.getByText('계정 탈퇴',{exact:true}).click();
 const confirmation=account.getByRole('textbox',{name:/확인용 이메일/});
 await confirmation.fill('different@example.test');
 await account.getByRole('button',{name:'계정 탈퇴 확정'}).click();
 await expect(account).toContainText('회원 이메일을 정확히 입력해 주세요.');
 expect(actions).toEqual(['status','reset']);
 await confirmation.fill(member.email);
 await account.getByRole('button',{name:'계정 탈퇴 확정'}).click();
 await expect(account).toContainText('탈퇴 처리됨 · 기존 기록 열람 가능');
 await expect(page.locator('#access-form button')).toBeDisabled();
 expect(actions).toEqual(['status','reset','retire']);
});
