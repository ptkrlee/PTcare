import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';

test('spinal asymmetry records angles and shows the CV average after all three readings',async({page,context})=>{
 const cloud=mockCloud();
 await cloud.attach(context);
 await login(page);
 await patient(page);
 const tab=page.locator('[data-tab=spinal-asymmetry]');
 await tab.click();
 await expect(page.getByRole('heading',{name:'척추비대칭평가'})).toBeVisible();
 await page.locator('.spinal-cover-identifiers').getByLabel('검사자').fill('테스트 검사자');

 await page.locator('#sca-fhp-cv-15').fill('42.25');
 await page.locator('#sca-fhp-cv-20').fill('43');
 await expect(page.locator('.spinal-survey h3')).toHaveText([
  '기본 정보','부위별 통증 (0–10점)','목 장애 지수 (NDI)','롤랜드-모리스 허리통증 장애 설문 (RMDQ)',
  '척추 이마면 비대칭 (SCA)','앞쪽머리자세 (FHP)',
 ]);
 await expect(page.locator('[data-spinal-total=cv]')).toHaveText('—');
 for(const region of ['cca','tca']){
  const layout=await page.locator(`#sca-${region}-1-direction .direct-choice`).evaluateAll(choices=>
   choices.map(choice=>({top:choice.offsetTop,left:choice.offsetLeft})));
  expect(layout[0].top).toBe(layout[1].top);
  expect(layout[1].left).toBeGreaterThan(layout[0].left);
  expect(layout[2].top).toBeGreaterThan(layout[0].top);
 }

 await page.locator('#view-incomplete').click();
 await expect(page.locator('.unresolved-highlight')).toContainText('NDI · 통증 강도');

 const readings={
  'cca-1':'0','cca-2':'2','cca-3':'3',
  'tca-1':'4','tca-2':'5','tca-3':'6','tca-left':'7','tca-right':'8',
  'fhp-speed':'6','fhp-cv-25':'44.5',
 };
 for(const [id,value] of Object.entries(readings))await page.locator('#sca-'+id).fill(value);
 await expect(page.locator('[data-spinal-total=cv]')).toHaveText('43.25 °');
 for(const region of ['cca','tca']){
  for(const [trial,choice] of [[1,region==='cca'?2:0],[2,1],[3,0]]){
   await page.locator(`#sca-${region}-${trial}-direction-option-${choice}`).check();
  }
 }
 await expect(tab.locator('.completion-pill')).toHaveCount(0);
 await page.locator('#sca-pain-neck').fill('6');
 await expect(page.locator('#sca-pain-waist')).toHaveValue('');
 for(let index=1;index<=10;index++)await page.locator('#sca-ndi-'+index+'-option-2').check();
 await expect(page.locator('[data-spinal-total=ndi]')).toHaveText('20 / 50점');
 await expect(page.locator('[data-spinal-total=rmdq]')).toHaveText('—');
 await page.locator('#sca-rmdq-confirmed-option-0').check();
 await expect(page.locator('[data-spinal-total=rmdq]')).toHaveText('0 / 24점');
 await page.locator('#sca-rmdq-items-0').check();
 await page.locator('#sca-rmdq-items-23').check();
 await expect(page.locator('[data-spinal-total=rmdq]')).toHaveText('2 / 24점');
 await expect(tab.locator('.completion-pill')).toHaveText('✓ 완료');
 await expect(page.locator('[data-spinal-photo]')).toHaveCount(12);
 await expect(page.locator('table').filter({hasText:'목뼈 (CCA)'}).locator('tbody th')).toHaveText(['기울기 방향','측정값 · 사진']);
 const photoSlots=['sca-cca-1','sca-tca-right','sca-fhp-cv-20'];
 for(const slot of photoSlots){
  const photo=page.locator(`[data-spinal-photo="${slot}"]`);
  await expect(photo.locator('input[capture]')).toHaveAttribute('capture','environment');
  await photo.locator('input:not([capture])').setInputFiles({
   name:'측정.png',mimeType:'image/png',
   buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nX0AAAAASUVORK5CYII=','base64'),
  });
  await expect(photo.locator('[data-spinal-photo-view] img')).toBeVisible();
 }

 await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 const saved=[...cloud.rows.values()][0].document.visits[0].forms['spinal-asymmetry'];
 expect(Object.keys(saved.measurementPhotos)).toEqual(photoSlots);
 await page.reload();
 for(const slot of photoSlots)await expect(page.locator(`[data-spinal-photo="${slot}"] img`)).toBeVisible();
 await page.locator('[data-spinal-photo="sca-cca-1"] [data-spinal-photo-view]').click();
 await expect(page.locator('#app-dialog .spinal-photo-preview')).toBeVisible();
 await page.getByRole('button',{name:'사진 삭제',exact:true}).click();
 await expect(page.locator('[data-spinal-photo="sca-cca-1"] img')).toHaveCount(0);
 await expect(page.locator('#sca-cover-examiner')).toHaveValue('테스트 검사자');
 await expect(page.locator('#sca-cca-1')).toHaveValue('0');
 await expect(page.locator('#sca-cca-1-direction-option-2')).toBeChecked();
 await expect(page.locator('#sca-tca-2-direction-option-1')).toBeChecked();
 await expect(page.locator('#sca-pain-neck')).toHaveValue('6');
 await expect(page.locator('#sca-rmdq-items-23')).toBeChecked();
 await page.locator('.score-sidebar .result-button').click();
 const result=page.locator('.result-measurements');
 await expect(result).toContainText('테스트 검사자');
 await expect(result.getByText('등허리뼈 (TCA) 중립 2차 기울기 방향').locator('..')).toContainText('오른쪽');
 await expect(result).toContainText('43.25 °');
 await expect(result).toContainText('20 / 50점');
 await expect(result).toContainText('2 / 24점');
});
