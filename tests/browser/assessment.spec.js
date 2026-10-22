import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
const total=page=>page.locator('[data-total]');
const saved=page=>expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
async function chooseAll(page,index){for(const item of await page.locator('.question-card').all())await item.locator('input[type=radio]').nth(index).check();}

test('authentication and patient selection are required before an assessment',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);
 await page.goto('/#/patients/nonexistent/visits/none/assessments/bbs');
 await expect(page.locator('#auth-form')).toBeVisible();await expect(page.locator('.question-card')).toHaveCount(0);
 await login(page);await expect(page.locator('.evaluation-card')).toHaveCount(0);await patient(page);
 await expect(page.locator('.assessment-person')).toContainText('홍길동');await expect(page.locator('#bbs-0')).toBeVisible();
});
test('latest input survives immediate page departure and reload while offline, then syncs',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await saved(page);
 cloud.setOffline(true);await page.locator('#bbs-0-0').check();await page.locator('#form-note').fill('다음 방문에 이어서: 마지막 입력');
 const url=page.url();await page.goto('about:blank');await page.goto(url);
 await expect(page.locator('#bbs-0-0')).toBeChecked();await expect(page.locator('#form-note')).toHaveValue('다음 방문에 이어서: 마지막 입력');
 await expect(total(page)).toHaveText('4');cloud.setOffline(false);await page.locator('#sync-now').click();await saved(page);
 expect([...cloud.rows.values()][0].document.visits[0].forms.bbs.note).toBe('다음 방문에 이어서: 마지막 입력');
});
test('skipped versus zero, later completion, result, print contrast and preserved tab state',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);
 await page.locator('#bbs-0-skip').check();await page.locator('#bbs-1-4').check();
 await expect(total(page)).toHaveText('0');await expect(page.locator('[data-progress-text]')).toContainText('1 / 14 · 미평가 1');
 await page.locator('[data-tab=satisfaction]').click();await page.locator('#satisfaction-0-skip').check();await page.locator('[data-tab=bbs]').click();
 await expect(page.locator('#bbs-0-skip')).toBeChecked();
 await page.locator('.score-card .result-button').click();await expect(page.locator('.result-sheet')).toContainText('미완료 · 부분 점수');
 await expect(page.locator('.result-table tbody tr').nth(0)).toContainText('미평가 · 다음에 하기');await expect(page.locator('.result-table tbody tr').nth(1).locator('td').last()).toHaveText('0');
 await page.emulateMedia({media:'print'});await expect(page.locator('.save-bar')).toBeHidden();
 expect(await page.locator('.result-table').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(0, 0, 0)');
 await page.pdf({path:'/tmp/ptcare-records-result.pdf',format:'A4'});await page.emulateMedia({media:'screen'});
 await page.locator('.result-toolbar a').click();await chooseAll(page,0);await expect(total(page)).toHaveText('56');
 await page.locator('.score-card .result-button').click();await expect(page.locator('.result-score')).toContainText('평가 총점');
});
test('new patient and new visit cannot inherit another patient or previous visit responses',async({page,context})=>{
 const cloud=mockCloud();cloud.access.get('11111111-1111-4111-8111-111111111111').patient_limit=2;await cloud.attach(context);await login(page);await patient(page);await page.locator('#bbs-0-0').check();
 await page.getByRole('link',{name:'회차 목록',exact:true}).click();await page.locator('#new-visit').click();await page.locator('#visit-form button[type=submit],#visit-form button:not([type])').last().click();
 await page.locator('.visit-card').first().locator('.evaluation-card').first().click();await expect(total(page)).toHaveText('0');
 await page.locator('.breadcrumbs a').first().click();await patient(page,'김영희');await expect(total(page)).toHaveText('0');await expect(page.locator('.assessment-person')).toContainText('김영희');
 expect(cloud.rows.size<=2).toBe(true);
});
test('MoCA variants, unscored recall, drawing persistence and measurement skip/resume',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);
 await page.locator('[data-tab="moca-k"]').click();await page.locator('#moca-k-education').fill('6');await chooseAll(page,0);
 // Every item is binary except serial subtraction: its first option is zero.
 await page.locator('#moca-k-serial7-3').check();await expect(total(page)).toHaveText('30');
 await page.locator('#moca-k-memory-1-0').check();await expect(total(page)).toHaveText('30');
 const canvas=page.locator('[data-drawing="1"]');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+70,box.y+60,{steps:4});await page.mouse.up();
 await page.reload();await expect(page.locator('#moca-k-memory-1-0')).toBeChecked();
 expect(await page.locator('[data-drawing="1"]').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0))).toBe(true);
 await page.locator('[data-tab="moca-k2"]').click();await chooseAll(page,0);await page.locator('#moca-k2-serial7-3').check();await expect(total(page)).toHaveText('30');
 await page.locator('[data-tab=circumference]').click();await page.locator('#body-waist').fill('80');await page.locator('#body-hip').fill('100');await expect(page.locator('[data-computed]')).toContainText('0.800');
 await page.locator('[data-skip-field="body-calf-right"]').click();await expect(page.locator('#body-calf-right')).toBeDisabled();await page.reload();await expect(page.locator('#body-calf-right')).toBeDisabled();
 await page.locator('[data-skip-field="body-calf-right"]').click();await page.locator('#body-calf-right').fill('32');await expect(page.locator('#body-calf-right')).toHaveValue('32');
});
test('same user continues on another device; another therapist cannot see patient records; logout clears local patient cache',async({browser})=>{
 const cloud=mockCloud();const c1=await browser.newContext(),c2=await browser.newContext(),other=await browser.newContext();await Promise.all([cloud.attach(c1),cloud.attach(c2),cloud.attach(other)]);
 const a=await c1.newPage();await login(a);await patient(a);await a.locator('#bbs-0-0').check();await saved(a);
 const b=await c2.newPage();await login(b);await b.locator('.patient-card').click();await b.locator('.evaluation-card').first().click();await expect(b.locator('#bbs-0-0')).toBeChecked();
 const stranger=await other.newPage();await login(stranger,'other@example.test');await expect(stranger.locator('.patient-card')).toHaveCount(0);
 await a.locator('#logout').click();await expect(a.locator('#auth-form')).toBeVisible();
 expect(await a.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ptcare-records-v1:')).length)).toBe(0);
 await Promise.all([c1.close(),c2.close(),other.close()]);
});
test('mobile target flow and all assessment pages stay inside viewport; selection is visibly distinguished',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);await page.locator('#bbs-0-0').check();
 const selectedColor=await page.locator('#bbs-0-0').evaluate(el=>getComputedStyle(el.closest('label')).backgroundColor);
 const otherColor=await page.locator('#bbs-0-1').evaluate(el=>getComputedStyle(el.closest('label')).backgroundColor);expect(selectedColor).not.toBe(otherColor);
 await page.screenshot({path:'/tmp/ptcare-platform-mobile.png',fullPage:false});
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});for(const key of ['bbs','moca-k','moca-k2','sppb','grip','sts','one-leg','tug','circumference','sarcopenia']){await page.locator(`[data-tab="${key}"]`).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${key} `+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,50)}))))).toBe(true);}}
 await page.setViewportSize({width:1280,height:1000});await page.screenshot({path:'/tmp/ptcare-platform-desktop.png'});
});
