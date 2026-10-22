import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';
const total=page=>page.locator('.score-card [data-total]');
test('SPPB raw measurements calculate scores live, preserve skipped states and print the derived result',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=sppb]').click();await expect(page.locator('.brand')).toContainText('PTcare');await expect(page.locator('#sppb-balance input[type=radio]')).toHaveCount(0);
 for(const [id,value] of [['sppb-side','10'],['sppb-semi','10'],['sppb-tandem','9.99'],['sppb-gait-1','6.20'],['sppb-chair-time','13.70']])await page.locator('#'+id).fill(value);
 await page.locator('#sppb-chair-single').selectOption('팔 사용 없이 가능');await expect(total(page)).toHaveText('8');await expect(page.locator('#sppb-balance [data-question-state]')).toHaveText('3점');
 await page.locator('#sppb-gait-1').fill('6.21');await expect(total(page)).toHaveText('7');await expect(page.locator('#sppb-gait [data-question-state]')).toHaveText('2점');
 await page.locator('[data-skip-field=sppb-chair-time]').click();await expect(page.locator('#sppb-chair [data-question-state]')).toHaveText('미평가');await expect(page.locator('[data-status]')).toContainText('미완료');
 await page.locator('[data-skip-field=sppb-chair-time]').click();await page.locator('#sppb-chair-time').fill('11.19');await expect(total(page)).toHaveText('9');await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 await page.reload();await expect(total(page)).toHaveText('9');await page.locator('.score-card .result-button').click();await expect(page.locator('.result-score')).toContainText('평가 총점');await expect(page.locator('.result-measurements')).toContainText('2 / 4점');await expect(page.locator('.result-brand')).toContainText('PTcare');
});
test('TUG uses assessment age and selected standard conditions; disease criteria do not leak between groups',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=tug]').click();
 await page.locator('#tug-original').fill('12');await expect(page.locator('[data-computed]')).toContainText('조건');
 await page.locator('#tug-distance').fill('3');await page.locator('#tug-pace').selectOption('평소 속도');await page.locator('#tug-assistance').selectOption('신체적 도움 없음');await page.locator('#tug-population').selectOption('지역사회 거주 일반 고령자');
 await expect(page.locator('[data-computed]')).toContainText('12초 이상');await expect(page.locator('[data-computed]')).toContainText('만 76세');
 await page.locator('#tug-population').selectOption('뇌졸중');await expect(page.locator('[data-computed]')).toContainText('일반 고령자 기준을 적용하지 않습니다');await expect(page.locator('[data-computed]')).not.toContainText('선별 기준 해당');
 await page.locator('#tug-population').selectOption('고관절 골절 수술 후 6개월');await page.locator('#tug-original').fill('24');await expect(page.locator('[data-computed]')).toContainText('24초 참고값 이상');
 await page.locator('#tug-assistance').selectOption('신체적 도움 있음');await expect(page.locator('[data-computed]')).not.toContainText('24초 참고값 이상');
 await page.locator('#tug-assistance').selectOption('신체적 도움 없음');await page.locator('.score-card .result-button').click();await expect(page.locator('.result-measurements')).toContainText('24초 참고값 이상');
});
test('MoCA raw counts drive the selected score and clearing a measurement restores manual control',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await page.locator('[data-tab=moca-k]').click();
 await page.locator('#moca-k-fluency-count').fill('11');await expect(page.locator('#moca-k-fluency [data-question-state]')).toHaveText('1점');await expect(page.locator('#moca-k-fluency input[type=radio]')).toHaveCount(0);
 await page.locator('#moca-k-fluency-count').fill('10');await expect(page.locator('#moca-k-fluency [data-question-state]')).toHaveText('0점');
 await page.locator('#moca-k-serial7-correct').fill('5');await expect(page.locator('#moca-k-serial7-3')).toBeChecked();
 await page.locator('#moca-k-vigilance-errors').fill('0');await expect(page.locator('#moca-k-vigilance-0')).toBeChecked();await expect(total(page)).toHaveText('4');
 await page.locator('#moca-k-fluency-count').fill('');await expect(page.locator('#moca-k-fluency [data-question-state]')).toHaveText('미선택');
});

test('both MoCA versions place drawing by the scored task and let therapists count fluency and select recall methods',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await page.setViewportSize({width:390,height:844});await login(page);await patient(page);
 for(const key of ['moca-k','moca-k2']){
  await page.locator(`[data-tab="${key}"]`).click();await expect(page.locator(`#${key}-trail [data-drawing="0"]`)).toBeVisible();await expect(page.locator(`#${key}-cube [data-drawing="1"]`)).toHaveCount(1);await expect(page.locator(`#${key}-clock-contour [data-drawing="2"]`)).toHaveCount(1);await expect(page.locator(`#${key}-fluency-response`)).toHaveCount(0);
  await page.locator('[data-patient-drawing="1"]').click();await expect(page.locator('.patient-task-dialog')).toBeVisible();await expect(page.locator('.patient-drawing-screen')).not.toContainText('얼굴');if(key==='moca-k')await page.screenshot({path:'/tmp/ptcare-moca-patient.png'});const canvas=page.locator('#patient-task-canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();await page.mouse.move(box.x+30,box.y+30);await page.mouse.down();await page.mouse.move(box.x+90,box.y+80,{steps:4});await page.mouse.up();await page.locator('#finish-patient-drawing').click();await expect(page.locator(`#${key}-cube-0`)).not.toBeChecked();await page.locator(`#${key}-cube-0`).check();
  await page.locator(`#${key}-fluency-count`).fill(key==='moca-k'?'11':'6');await page.locator(`#${key}-recall-status`).selectOption('실시함');await page.locator(`#${key}-cue-0`).selectOption('단서 없이 회상');await page.locator(`#${key}-cue-1`).selectOption('범주 단서 후 회상');await page.locator(`#${key}-cue-2`).selectOption('선다형 단서 후 회상');await page.locator(`#${key}-cue-3`).selectOption('회상 못함');await page.locator(`#${key}-cue-4`).selectOption('미실시');await expect(page.locator(`#${key}-recall-0 [data-question-state]`)).toHaveText('1점');await expect(page.locator(`#${key}-recall-1 [data-question-state]`)).toHaveText('0점');await expect(page.locator(`#${key}-recall-4 [data-question-state]`)).toHaveText('미평가');await expect(total(page)).toHaveText('3');if(key==='moca-k'){await page.locator('#moca-k-recall-section').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ptcare-moca-recall.png'});}
  expect(await page.locator(`#${key}-fluency`).evaluate((el,recall)=>!!(el.compareDocumentPosition(document.getElementById(recall))&Node.DOCUMENT_POSITION_FOLLOWING),`${key}-recall-section`)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');await page.reload();await expect(page.locator(`#${key}-cue-0`)).toHaveValue('단서 없이 회상');await expect(total(page)).toHaveText('3');
 }
});

test('old trail observation strokes remain unaltered until explicitly switching to the original task',async({page,context})=>{
 const cloud=mockCloud();await cloud.attach(context);await login(page);await patient(page);await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');const record=[...cloud.rows.values()][0];record.document.visits[0].forms['moca-k']={answers:{'moca-k-trail':1},fields:{},drawings:{'0':[[[20,20],[100,100]]]},answeredAt:{}};record.revision++;await page.reload();await page.locator('[data-tab=moca-k]').click();await expect(page.locator('[data-patient-drawing="0"]')).toContainText('이전 관찰 메모');expect(await page.locator('[data-drawing="0"]').evaluate(canvas=>canvas.getContext('2d').getImageData(400,200,1,1).data[3])).toBe(0);
 await page.locator('[data-clear-drawing="0"]').click();await page.locator('#clear-drawing').click();await expect(page.locator('[data-patient-drawing="0"]')).toContainText('대상자에게 보여주기');await expect.poll(()=>page.locator('[data-drawing="0"]').evaluate(canvas=>canvas.getContext('2d').getImageData(400,200,1,1).data[3])).toBe(255);await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');const stored=[...cloud.rows.values()][0].document.visits[0].forms['moca-k'];expect(stored.drawingHistory[0].strokes).toEqual([[[20,20],[100,100]]]);expect(stored.drawingModes['0']).toBe('source-task-v1');
});
