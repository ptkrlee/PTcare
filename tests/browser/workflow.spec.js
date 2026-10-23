import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mockCloud,login,patient} from './mock-cloud.js';
import {getAssessment} from '../../src/data.js';
import {newForm} from '../../src/records.js';
const choose=(page,id,value)=>page.locator('#'+id).getByRole('radio',{name:value,exact:true}).check();
const criterion=(page,id,value)=>page.locator(`[data-criterion="${id}"][value="${value}"]`).check();
test('timed criteria save confirmed bounds without inventing measured times; failed criteria require seconds and remove completion',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=sppb]').click();
 for(const id of ['sppb-side','sppb-semi','sppb-tandem','sppb-gait-1','sppb-chair-time'])await criterion(page,id,'passed');
 await choose(page,'sppb-chair-single','팔 사용 없이 가능');await expect(page.locator('.score-card [data-total]')).toHaveText('12');await expect(page.locator('[data-tab=sppb]')).toContainText('완료');await expect(page.locator('[data-tab=sppb] small')).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
 await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');let saved=[...cloud.rows.values()][0].document.visits[0].forms.sppb;expect(saved.fields['sppb-side']).toBeUndefined();expect(saved.fields['sppb-gait-1']).toBeUndefined();expect(saved.completedAt).toBeTruthy();const completed=saved.completedAt;
 await page.locator('#form-note').fill('다음에도 동일 조건');await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');expect([...cloud.rows.values()][0].document.visits[0].forms.sppb.completedAt).toBe(completed);
 await criterion(page,'sppb-tandem','below');await expect(page.locator('#sppb-tandem')).toHaveAttribute('required','');await expect(page.locator('[data-tab=sppb]')).not.toContainText('완료');await expect(page.locator('#sppb-balance [data-question-state]')).toHaveText('점수 미확정');await page.locator('#sppb-tandem').fill('9.99');await expect(page.locator('.score-card [data-total]')).toHaveText('11');await expect(page.locator('[data-tab=sppb]')).toContainText('완료');
 await page.locator('#sppb-tandem').fill('10');await expect(page.locator('[data-tab=sppb]')).not.toContainText('완료');await expect(page.locator('#sppb-tandem')).toHaveAttribute('aria-invalid','true');
 await criterion(page,'sppb-tandem','passed');await choose(page,'sppb-distance','3');await expect(page.locator('[data-criterion=sppb-gait-1]:checked')).toHaveCount(0);await expect(page.locator('[data-tab=sppb]')).not.toContainText('완료');
 await page.locator('[data-tab=one-leg]').click();for(const id of ['ols-open-right','ols-open-left','ols-closed-right','ols-closed-left'])await criterion(page,id,'passed');await expect(page.locator('[data-tab=one-leg]')).toContainText('완료');await page.locator('.score-card .result-button').click();await expect(page.locator('.result-measurements')).toContainText('통과 · 30초 이상 / 실제 미입력');await expect(page.locator('.result-title')).toContainText('평가 완료');
});
test('grip sex and dominant hand are visible choices; completion survives page changes and reloads',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=grip]').click();await expect(page.locator('.measurement-card select')).toHaveCount(0);await choose(page,'grip-sex','여성');await choose(page,'grip-dominant','왼손');
 for(const side of ['right','left'])for(const n of [1,2,3])await page.locator(`#grip-${side}-${n}`).fill('19.5');await expect(page.locator('[data-tab=grip]')).toContainText('완료');await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');await page.reload();await expect(page.locator('#grip-sex input[value="여성"]')).toBeChecked();await expect(page.locator('[data-tab=grip]')).toContainText('완료');await page.getByRole('link',{name:'회차 목록',exact:true}).click();await expect(page.locator('.evaluation-card').filter({hasText:'악력'})).toContainText('완료');
});
test('both fully populated MoCA results including all three drawings print on one A4 page',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 const row=[...cloud.rows.values()][0];
 for(const key of ['moca-k','moca-k2']){
  const a=getAssessment(key),f=newForm();f.answers=Object.fromEntries(a.items.map(x=>[x.id,Math.max(...x.options.map(o=>o.score))]));f.fields=Object.fromEntries(a.fields.map(field=>[field.id,field.type==='checks'?a.words:field.type==='select'?field.options[0]:field.type==='time'?'11:30':field.type==='number'?field.id.endsWith('education')?'6':field.id.endsWith('fluency-count')?'15':field.id.endsWith('serial7-correct')?'5':'0':'담당 물리치료사']));f.drawings=Object.fromEntries([0,1,2].map(id=>[id,[[[80,80],[170,90],[190,200],[80,80]]]]));f.drawingSizes=Object.fromEntries([0,1,2].map(id=>[id,{width:800,height:600}]));f.drawingModes={'0':'source-task-v1'};f.note='검사 중 피로감을 확인하며 시행함. '+ '관찰 내용 기록. '.repeat(15);f.completedAt='2026-10-23T01:36:00Z';row.document.visits[0].forms[key]=f;
 }
 row.revision++;await page.reload();
 for(const key of ['moca-k','moca-k2']){
  await page.locator(`[data-tab="${key}"]`).click();await expect(page.locator('.measurement-card select')).toHaveCount(0);await expect(page.locator(`#${key}-cue-0 input[type=radio]`)).toHaveCount(5);await expect(page.locator(`[data-tab="${key}"]`)).toContainText('완료');await expect(page.locator('.score-card [data-total]')).toHaveText('30');
  await page.locator(`#${key}-recall-section`).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(key==='moca-k')await page.screenshot({path:'/tmp/ptcare-direct-recall.png'});
  await page.locator('.mobile-score .result-button').click();await expect(page.locator('.result-table tbody tr')).toHaveCount(aCount(key));await expect(page.locator('[data-result-drawing]')).toHaveCount(3);await page.emulateMedia({media:'print'});await page.pdf({path:`/tmp/ptcare-${key}-one-page.pdf`,format:'A4',preferCSSPageSize:true});const info=execFileSync('pdfinfo',[`/tmp/ptcare-${key}-one-page.pdf`],{encoding:'utf8'});expect(info).toMatch(/Pages:\s+1\b/);await page.emulateMedia({media:'screen'});await page.locator('.result-toolbar a').click();
 }
});
function aCount(key){return getAssessment(key).items.length;}

test('the other assessment summary sheets fit one A4 page with standard entries',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');const row=[...cloud.rows.values()][0];
 const keys=['bbs','mbi','satisfaction','sppb','grip','sts','one-leg','tug','circumference','sarcopenia'];
 for(const key of keys){const a=getAssessment(key),f=newForm();f.answers=Object.fromEntries(a.items.map(x=>[x.id,Math.max(...x.options.map(o=>o.score))]));f.fields=Object.fromEntries((a.fields||[]).map(field=>[field.id,field.type==='select'?field.options[0]:field.type==='number'?field.max===10?'10':'3':'조건 확인하여 시행함']));f.note='시행 중 안전을 확인하고 관찰 내용을 기록함.';row.document.visits[0].forms[key]=f;}
 row.revision++;await page.reload();
 for(const key of keys){await page.locator(`[data-tab="${key}"]`).click();await page.locator('.score-card .result-button').click();await expect(page.locator('.result-title h1')).toHaveText(getAssessment(key).title);await page.pdf({path:`/tmp/ptcare-${key}-summary.pdf`,format:'A4',preferCSSPageSize:true});expect(execFileSync('pdfinfo',[`/tmp/ptcare-${key}-summary.pdf`],{encoding:'utf8'}),key).toMatch(/Pages:\s+1\b/);await page.locator('.result-toolbar a').click();}
});

test('MBI mobility is directly selectable and changing it clears only the alternate mobility answer',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=mbi]').click();await page.locator('#mbi-0-4').check();await page.locator('#mbi-8-4').check();await page.locator('#mobility input[value=wheelchair]').check();await expect(page.locator('#mobility input[value=wheelchair]')).toBeChecked();await expect(page.locator('#mbi-0-4')).toBeChecked();await expect(page.locator('#mbi-8 input:checked')).toHaveCount(0);await expect(page.locator('.score-number')).toContainText('90');
});
