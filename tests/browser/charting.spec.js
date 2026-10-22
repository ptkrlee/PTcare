import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
async function openChart(page){await page.locator('.assessment-actions a[href$="/charting"]').click();await expect(page.locator('#chart-context')).toBeVisible();}
async function addPlan(page,id='01-01'){await page.locator('#exercise-search').fill(id);await page.locator(`[data-add-exercise="${id}"]`).click();}
async function confirmActual(page,id='01-01'){await page.locator(`[data-perform="${id}"]`).click();await page.locator('#chart-confirm').click();}
const field=(page,key)=>page.locator(`[data-chart-field="${key}"]`);

test('patient charting has all examples, separates plan from actual, generates and reviews a printable note',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('#bbs-0-3').check();await openChart(page);
 await expect(page.locator('#library-count')).toContainText('90개');
 await field(page,'therapist').fill('테스트 치료사');await field(page,'subjective').fill('앉은 자세에서 발목 운동을 희망함.');
 await addPlan(page);await page.locator('#generate-note').click();await expect(page.locator('#chart-validation')).toBeEmpty();await expect(page.locator('#note-draft')).toHaveValue(/좌우 각 10회/);await expect(page.locator('#note-draft')).not.toHaveValue(/실제 수행 운동|미기록/);
 await page.locator('[data-entry-kind=plan][data-entry-field=reps]').fill('12');await confirmActual(page);
 await expect(page.locator('[data-entry-kind=performed][data-entry-field=reps]')).toHaveValue('');
 await page.locator('[data-entry-kind=performed][data-entry-field=reps]').fill('7');await field(page,'response').fill('관찰한 반응을 직접 기록함.');
 await field(page,'homework').fill('매일 발목 운동');await field(page,'nextVisitDate').fill('2026-10-29');await field(page,'nextVisitTime').fill('14:30');await page.locator('#generate-note').click();await page.locator('#chart-confirm').click();await expect(page.locator('#note-draft')).toHaveValue(/2026-10-29 14:30/);await expect(page.locator('#note-draft')).toHaveValue(/매일 발목 운동/);await expect(page.locator('#note-draft')).toHaveValue(/7회/);await expect(page.locator('#note-draft')).not.toHaveValue(/12회/);await expect(page.locator('#note-draft')).toHaveValue(/원점수|부분 점수/);
 await page.locator('#review-note').click();await page.locator('#chart-confirm').click();await expect(page.locator('[data-note-state]')).toContainText('검토 완료');
 await page.locator('a[href$="/print-note"]').click();await expect(page.locator('.result-title')).toContainText('치료사 검토 완료');await page.emulateMedia({media:'print'});await expect(page.locator('.progress-note-print')).toHaveCSS('color','rgb(0, 0, 0)');await page.pdf({path:'/tmp/ptcare-progress-note.pdf',format:'A4'});await page.emulateMedia({media:'screen'});
 await page.locator('.result-toolbar a').click();await field(page,'response').fill('추가로 확인한 반응');await expect(page.locator('[data-note-state]')).toContainText('변경됨');await page.locator('#review-note').click();await expect(page.locator('#chart-validation')).toContainText('다시 생성');await expect(page.locator('.chart-history')).toContainText('검토본');
});
test('recommendations are blocked until confirmed and cannot silently replace the selected plan',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await openChart(page);
 await addPlan(page);await page.locator('#recommend-plan').click();await expect(page.locator('#recommendations')).toContainText('확인');
 await page.locator('#capability').selectOption('sitting');await page.locator('#safety').selectOption('cleared');await page.locator('[data-equipment=chair]').check();await page.locator('[data-goal="일어서기"]').check();await page.locator('#recommend-plan').click();await expect(page.locator('[data-recommend]').first()).toBeVisible();
 await expect(page.locator('.selected-plan .exercise-entry')).toHaveCount(1);await expect(page.locator('.performed-entry')).toHaveCount(0);
 await field(page,'context.precautions').fill('부하 제한 확인 필요');await page.locator('#recommend-plan').click();await expect(page.locator('#recommendations')).toContainText('보류');await expect(page.locator('[data-recommend]')).toHaveCount(0);
});
test('unfinished chart inputs and manual draft survive leaving offline; mobile chart and program print fit',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);await openChart(page);await addPlan(page);await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 cloud.setOffline(true);await field(page,'response').fill('마지막 관찰 한 글자까지');await page.locator('#note-draft').fill('직접 편집한 미완료 기록');const url=page.url();await page.goto('about:blank');await page.goto(url);await expect(field(page,'response')).toHaveValue('마지막 관찰 한 글자까지');await expect(page.locator('#note-draft')).toHaveValue('직접 편집한 미완료 기록');
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:1280,height:1000});await page.locator('#chart-context').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ptcare-charting-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('#chart-performed').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ptcare-charting-mobile.png'});
 cloud.setOffline(false);await page.locator('#sync-now').click();await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 await page.locator('a[href$="/print-program"]').click();await expect(page.locator('.result-title')).toContainText('실제 실시 기록과 구분');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
