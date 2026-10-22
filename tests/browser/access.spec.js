import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
const therapist='11111111-1111-4111-8111-111111111111';
test('unapproved therapist is gated; ordinary accounts cannot open admin tools',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.goto('/');await page.locator('#auth-email').fill('pending@example.test');await page.locator('#auth-password').fill('test-password-only');await page.locator('#auth-form button').click();await expect(page.locator('#temporary-patient-form')).toBeVisible();await expect(page.locator('.temporary-mode')).toContainText('저장 없음');
 await page.goto('/#/patients/fake/visits/fake/charting');await expect(page.locator('#chart-context')).toHaveCount(0);
 await page.goto('/#/admin');await expect(page.getByText('관리자만 접근할 수 있습니다.')).toBeVisible();await expect(page.locator('#admin-therapists')).toHaveCount(0);
});
test('free account allows one patient and three editable visits; further creation is blocked',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.getByRole('link',{name:'회차 목록',exact:true}).click();
 for(let i=0;i<2;i++){await page.locator('#new-visit').click();await page.locator('#visit-form .button.primary').click();await expect(page.locator('.visit-card')).toHaveCount(i+2);}
 await page.locator('#new-visit').click();await expect(page.locator('#app-dialog')).toContainText('최대 3회차');await page.locator('button[data-close]').click();
 await page.locator('.visit-card').first().locator('.evaluation-card').first().click();await page.locator('#bbs-0-0').check();await expect(page.locator('#bbs-0-0')).toBeChecked();
 await page.locator('.breadcrumbs a').first().click();await page.locator('#new-patient').click();await expect(page.locator('#app-dialog')).toContainText('최대 1명');await expect(page.locator('#patient-form')).toHaveCount(0);await expect(page.locator('.usage-banner')).toContainText('1/1명');await page.locator('#app-dialog a[href="#/account"]').click();await expect(page.locator('#member-request-form')).toBeVisible();
});
test('admin can inspect clinical data read-only, grant limits with audit, and approve a therapist',async({page,context,browser})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('#bbs-0-3').check();await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 const adminContext=await browser.newContext();await cloud.attach(adminContext);const admin=await adminContext.newPage();await login(admin,'admin@example.test');await admin.getByRole('link',{name:'관리자',exact:true}).click();
 await admin.locator(`[data-admin-user="${therapist}"]`).click();await expect(admin.locator('#admin-detail')).toContainText('홍길동');await expect(admin.locator('#admin-detail')).toContainText('읽기 전용');await expect(admin.locator('.admin-assessment')).toHaveCount(1);await expect(admin.locator('#admin-detail [data-chart-field],#admin-detail [data-add-exercise],#admin-detail [data-entry-field]')).toHaveCount(0);
 await admin.locator('#access-form [name=patients]').fill('2');await admin.locator('#access-form [name=visits]').fill('5');await admin.locator('#access-form [name=reason]').fill('대상자 1명 및 회차 2회 추가');await admin.locator('#access-form button').click();await expect(admin.locator('#admin-detail')).toContainText('대상자 1명 및 회차 2회 추가');expect(cloud.access.get(therapist).visit_limit).toBe(5);expect(cloud.audits).toHaveLength(1);
 await page.locator('.breadcrumbs a').first().click();await patient(page,'추가 대상자');await expect(page.locator('.assessment-person')).toContainText('추가 대상자');
 await admin.locator('[data-admin-user="44444444-4444-4444-8444-444444444444"]').click();await admin.locator('#access-form [name=approved]').check();await admin.locator('#access-form [name=reason]').fill('자격 확인 후 승인');await admin.locator('#access-form button').click();await expect(admin.locator('#admin-detail')).toContainText('자격 확인 후 승인');expect(cloud.access.get('44444444-4444-4444-8444-444444444444').approved).toBe(true);
 for(const width of [320,390,1280]){await admin.setViewportSize({width,height:900});expect(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await admin.screenshot({path:'/tmp/ptcare-admin-desktop.png',fullPage:true});
 await adminContext.close();
});
