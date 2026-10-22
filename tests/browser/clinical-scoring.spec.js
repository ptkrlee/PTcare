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
 await page.locator('#moca-k-fluency-count').fill('11');await expect(page.locator('#moca-k-fluency-0')).toBeChecked();await expect(page.locator('#moca-k-fluency-0')).toBeDisabled();
 await page.locator('#moca-k-fluency-count').fill('10');await expect(page.locator('#moca-k-fluency-1')).toBeChecked();
 await page.locator('#moca-k-serial7-correct').fill('5');await expect(page.locator('#moca-k-serial7-3')).toBeChecked();
 await page.locator('#moca-k-vigilance-errors').fill('0');await expect(page.locator('#moca-k-vigilance-0')).toBeChecked();await expect(total(page)).toHaveText('4');
 await page.locator('#moca-k-fluency-count').fill('');await expect(page.locator('#moca-k-fluency-0')).toBeEnabled();await expect(page.locator('#moca-k-fluency-0')).not.toBeChecked();
});
