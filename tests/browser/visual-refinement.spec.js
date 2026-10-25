import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
import {getAssessment} from '../../src/data.js';
import {newForm} from '../../src/records.js';
const field=(page,id,value)=>page.locator('#'+id).getByRole('radio',{name:value,exact:true}).check();
const saved=page=>expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
async function stroke(page,canvas,offset=0){await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();await page.mouse.move(box.x+25+offset,box.y+25);await page.mouse.down();await page.mouse.move(box.x+70+offset,box.y+70,{steps:4});await page.mouse.up();}

test('all fourteen legacy BBS scores display a pill and original completion date without invented times',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await saved(page);const row=[...cloud.rows.values()][0];const f=newForm();f.answers=Object.fromEntries(getAssessment('bbs').items.map((item,i)=>[item.id,i<3?3:0]));f.updatedAt='2026-10-22T01:00:00Z';row.document.visits[0].forms.bbs=f;row.revision++;await page.reload();
 await expect(page.locator('.score-card [data-total]')).toHaveText('9');await expect(page.locator('[data-tab=bbs] .completion-pill')).toHaveText('✓ 완료');await expect(page.locator('[data-tab=bbs] .completed-badge small')).toHaveText('2026-10-22');expect(await page.locator('.completion-pill').evaluate(el=>getComputedStyle(el).borderRadius)).toBe('999px');expect([...cloud.rows.values()][0].document.visits[0].forms.bbs.fields).toEqual({});
 await page.locator('#bbs-1-2').check();await expect(page.locator('[data-tab=bbs] .completion-pill')).toHaveCount(0);await expect(page.locator('#bbs-1-seconds')).toHaveAttribute('required','');await page.locator('#bbs-1-seconds').fill('30');await expect(page.locator('[data-tab=bbs] .completion-pill')).toBeVisible();await page.getByRole('link',{name:'회차 목록',exact:true}).click();await page.screenshot({path:'/tmp/ptcare-colored-evaluations.png',fullPage:true});
});

test('both MoCA versions show original animal pictures and the patient screen reveals no answer names',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);
 for(const key of ['moca-k','moca-k2']){await page.locator(`[data-tab="${key}"]`).click();await expect(page.locator('.animal-task svg')).toHaveCount(3);for(let n=0;n<3;n++)await expect(page.locator(`#${key}-naming-${n} svg image`)).toHaveAttribute('href','/reference/'+(key==='moca-k'?'moca-k.png':'moca-k2.png'));
  await page.locator('[data-patient-animal="0"]').click();await expect(page.locator('.patient-animal-screen')).not.toContainText(/사자|코뿔소|박쥐|낙타/);await expect(page.locator('.patient-animal-screen svg')).toBeVisible();await page.locator('#next-animal').click();await expect(page.locator('.patient-animal-screen h2')).toContainText('그림 2');if(key==='moca-k2')await page.screenshot({path:'/tmp/ptcare-animal-patient.png'});await page.locator('.patient-animal-screen [data-close]').click();await expect(page.locator(`#${key}-naming-0 input:checked`)).toHaveCount(0);}
});

test('undo removes exactly one stroke by button and keyboard on both cube and clock, and persists across reload',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=moca-k]').click();await page.locator('#moca-k-cube-0').check();
 for(const id of ['1','2']){const canvas=page.locator(`[data-drawing="${id}"]`);await stroke(page,canvas);await stroke(page,canvas,20);await saved(page);expect([...cloud.rows.values()][0].document.visits[0].forms['moca-k'].drawings[id]).toHaveLength(2);await page.locator(`[data-undo-drawing="${id}"]`).click();await saved(page);expect([...cloud.rows.values()][0].document.visits[0].forms['moca-k'].drawings[id]).toHaveLength(1);await canvas.press('Control+z');await saved(page);expect([...cloud.rows.values()][0].document.visits[0].forms['moca-k'].drawings[id]).toHaveLength(0);await stroke(page,canvas);}
 await page.locator('[data-patient-drawing="1"]').click();const full=page.locator('#patient-task-canvas');await stroke(page,full,20);await page.locator('#undo-patient-drawing').click();await full.press('Meta+z');await page.locator('#finish-patient-drawing').click();await saved(page);await page.reload();await expect(page.locator('#moca-k-cube-0')).toBeChecked();const f=[...cloud.rows.values()][0].document.visits[0].forms['moca-k'];expect(f.drawings['1']).toHaveLength(0);expect(f.drawings['2']).toHaveLength(1);
});

test('compact recall choices expose version-specific hints and do not move the selected row or scroll position',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);
 for(const key of ['moca-k','moca-k2']){await page.locator(`[data-tab="${key}"]`).click();await field(page,key+'-recall-status','실시함');const card=page.locator(`#${key}-recall-1`);await expect(card.locator('.recall-target strong')).toHaveText('비단');await expect(card.locator('.recall-cue-guide')).toContainText(key==='moca-k'?'나일론 · 면 · 비단':'면 · 삼베 · 비단');await card.scrollIntoViewIfNeeded();await page.evaluate(()=>document.activeElement?.blur());
  const before=await card.boundingBox(),scroll=await page.evaluate(()=>scrollY);await field(page,key+'-cue-1','단서 없이 회상');const after=await card.boundingBox();expect(Math.abs(after.y-before.y)).toBeLessThan(2);expect(Math.abs(after.height-before.height)).toBeLessThan(2);expect(Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThan(2);await field(page,key+'-cue-1','범주 단서 후 회상');expect(Math.abs((await card.boundingBox()).height-before.height)).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(key==='moca-k2')await page.screenshot({path:'/tmp/ptcare-compact-recall-stable.png'});}
});

test('brand palette and original care illustration are visible on the mobile landing screen',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await expect(page.locator('.care-illustration')).toBeVisible();expect(await page.locator('.site-header').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(23, 50, 77)');await page.screenshot({path:'/tmp/ptcare-brand-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('choosing the last recall answer and displaying completion does not shift the mobile card',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);await saved(page);const row=[...cloud.rows.values()][0],a=getAssessment('moca-k'),f=newForm();f.answers=Object.fromEntries(a.items.map(item=>[item.id,Math.max(...item.options.map(x=>x.score))]));f.fields={'moca-k-education':'12','moca-k-recall-status':'실시함',...Object.fromEntries([0,1,2,3].map(i=>['moca-k-cue-'+i,'단서 없이 회상']))};row.document.visits[0].forms['moca-k']=f;row.revision++;await page.reload();await page.locator('[data-tab=moca-k]').click();const card=page.locator('#moca-k-recall-4');await card.scrollIntoViewIfNeeded();const before=await card.boundingBox(),scroll=await page.evaluate(()=>scrollY);await field(page,'moca-k-cue-4','단서 없이 회상');await expect(page.locator('[data-tab=moca-k] .completion-pill')).toHaveText('✓ 완료');expect(Math.abs((await card.boundingBox()).y-before.y)).toBeLessThan(2);expect(Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThan(2);
});
