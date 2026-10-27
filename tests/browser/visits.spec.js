import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
const saved=page=>expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
test('chart adds visits through eight, switches between saved records, and blocks the ninth without changing earlier data',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);await page.getByRole('link',{name:'운동 프로그램 · 차팅',exact:true}).first().click();
 await page.locator('[data-chart-field=subjective]').fill('1회차에만 있는 경과기록');await saved(page);const first=[...cloud.rows.values()][0].document.visits[0].id;
 for(let n=2;n<=8;n++){
  await page.locator('#chart-new-visit').click();await expect(page.locator('#visit-form')).toContainText('운동기록지 회차 추가');await page.locator('#visit-form [name=date]').fill(`2026-10-${String(20+n).padStart(2,'0')}`);await page.locator('#visit-form [type=submit]').click();
  await expect(page.locator('.chart-patient')).toContainText(`${n}회차`);await expect(page.locator('#chart-visit-select option')).toHaveCount(n);await expect(page.locator('[data-chart-field=subjective]')).toHaveValue('');
 }
 await page.locator('[data-chart-field=subjective]').fill('8회차 기록');await saved(page);const eighth=[...cloud.rows.values()][0].document.visits.at(-1).id;
 await page.locator('#chart-new-visit').click();await expect(page.locator('#app-dialog')).toContainText('최대 8회차');await expect(page.locator('#visit-form')).toHaveCount(0);await page.locator('button[data-close]').click();
 await page.locator('#chart-visit-select').selectOption(first);await expect(page.locator('[data-chart-field=subjective]')).toHaveValue('1회차에만 있는 경과기록');await page.locator('#chart-visit-select').selectOption(eighth);await page.reload();await expect(page.locator('[data-chart-field=subjective]')).toHaveValue('8회차 기록');
 expect([...cloud.rows.values()][0].document.visits).toHaveLength(8);for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.setViewportSize({width:390,height:844});await page.locator('.chart-visit-controls').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ptcare-chart-visits-mobile.png'});
});
test('canceling a chart visit creates nothing and an older server limit is honored until SQL upgrade',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.getByRole('link',{name:'운동 프로그램 · 차팅',exact:true}).first().click();await page.locator('#chart-new-visit').click();await page.locator('#visit-form [data-close]').click();expect([...cloud.rows.values()][0].document.visits).toHaveLength(1);
 cloud.access.get('11111111-1111-4111-8111-111111111111').visit_limit=1;await page.locator('#chart-new-visit').click();await expect(page.locator('#app-dialog')).toContainText('최대 1회차');expect([...cloud.rows.values()][0].document.visits).toHaveLength(1);
});
