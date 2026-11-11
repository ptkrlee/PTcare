import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
import {newVisit,newForm} from '../../src/records.js';
const saved=p=>expect(p.locator('[data-save-status]')).toHaveText('서버 저장 완료');
test('history lists only assessed visits and entered tools while retaining zero scores, original visit numbers and all source data',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('#bbs-0-4').check();await saved(page);
 const row=[...cloud.rows.values()][0],p=row.document;p.visits[0].date='2026-11-01';
 const exercise=newVisit('2026-11-02',2);exercise.chart={subjective:'운동만 실시한 회차',performed:[]};
 const skipped=newVisit('2026-11-03',3);skipped.forms={tug:{...newForm(),fields:{'tug-distance':'3'}},bbs:{...newForm(),answers:{'bbs-0':'skipped'}}};
 const measured=newVisit('2026-11-04',4);measured.forms={rom:{...newForm(),fields:{'rom-regions':['knee'],'rom-knee-flex-right':'Full'}}};
 const setup=newVisit('2026-11-05',5);setup.forms={'moca-k':{...newForm(),fields:{'moca-k-education':'6','moca-k-examiner':'검사자'}}};
 p.visits.push(exercise,skipped,measured,setup);row.revision++;const before=JSON.stringify(p);await page.reload();await page.getByRole('link',{name:'회차 목록',exact:true}).click();
 await expect(page.locator('.visit-card')).toHaveCount(2);await expect(page.locator('.visit-card').first().locator('header h2')).toContainText('4회차');await expect(page.locator('.visit-card').last().locator('header h2')).toContainText('1회차');await expect(page.locator('.evaluation-card')).toHaveCount(2);await expect(page.locator('.evaluation-card[href$="/bbs"]')).toContainText('0/56');await expect(page.locator('.evaluation-card[href$="/rom"]')).toBeVisible();
 await page.locator('.visit-card').first().getByRole('link',{name:'평가 이어하기'}).click();await expect(page.locator('#assessment-title')).toContainText('ROM');await page.getByRole('link',{name:'회차 목록',exact:true}).click();await page.locator('.breadcrumbs a').first().click();await expect(page.locator('.patient-record-link small')).toHaveText('최근 평가 2026-11-04');expect(JSON.stringify(row.document)).toBe(before);
 await page.setViewportSize({width:390,height:844});await page.locator('.patient-card').click();await page.locator('.visits').screenshot({path:'/tmp/ptcare-filtered-assessment-history.png'});
});
test('exercise-only visits show an empty assessment history while their chart remains accessible and saved',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('.assessment-actions a[href$="/charting"]').click();await page.locator('[data-chart-field=subjective]').fill('운동 서비스만 제공');await saved(page);const p=[...cloud.rows.values()][0].document;
 await page.goto('/#/patients/'+p.id);await expect(page.locator('.visit-card')).toHaveCount(0);await expect(page.locator('[data-empty-assessment-history]')).toBeVisible();await page.locator('[data-patient-area=charting]').click();await expect(page.locator('[data-chart-field=subjective]')).toHaveValue('운동 서비스만 제공');await page.goto('/#/patients');await expect(page.locator('.patient-record-link small')).toHaveText('아직 평가기록 없음');
});
test('resetting the last assessment removes its history card and allows starting again through the chooser',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('#bbs-0-0').check();await saved(page);await page.locator('.score-card .reset-button').click();await page.locator('#confirm-reset').click();await saved(page);await page.getByRole('link',{name:'회차 목록',exact:true}).click();await expect(page.locator('.evaluation-card')).toHaveCount(0);await page.locator('[data-patient-area=assessments]').click();await page.locator('[data-tab=bbs]').click();await page.locator('#bbs-0-0').check();await page.getByRole('link',{name:'회차 목록',exact:true}).click();await expect(page.locator('.evaluation-card[href$="/bbs"]')).toHaveCount(1);
});
