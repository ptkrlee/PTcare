import {test,expect} from '@playwright/test';
import {mockCloud,login,patient} from './mock-cloud.js';

test('spinal asymmetry records angles and shows the CV average after all three readings',async({page,context})=>{
 await mockCloud().attach(context);
 await login(page);
 await patient(page);
 const tab=page.locator('[data-tab=spinal-asymmetry]');
 await tab.click();
 await expect(page.getByRole('heading',{name:'척추비대칭평가'})).toBeVisible();

 await page.locator('#sca-fhp-cv-15').fill('42.25');
 await page.locator('#sca-fhp-cv-20').fill('43');
 await expect(page.locator('.spinal-survey h3')).toHaveText([
  '기본 정보','부위별 통증 (0–10점)','경부장애척도 (NDI)','요통 장애 설문 (RMDQ)',
  '척추 관상면 비대칭 (SCA)','전방머리자세 (FHP)',
 ]);
 await expect(page.locator('[data-spinal-total=cv]')).toHaveText('—');
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
 await expect(page.locator('[data-save-status]')).toHaveText('서버 저장 완료');
 await page.reload();
 await expect(page.locator('#sca-cca-1')).toHaveValue('0');
 await expect(page.locator('#sca-cca-1-direction-option-2')).toBeChecked();
 await expect(page.locator('#sca-tca-2-direction-option-1')).toBeChecked();
 await expect(page.locator('#sca-pain-neck')).toHaveValue('6');
 await expect(page.locator('#sca-rmdq-items-23')).toBeChecked();
 await page.locator('.score-sidebar .result-button').click();
 const result=page.locator('.result-measurements');
 await expect(result.getByText('흉요추 (TCA) 중립 2차 기울기 방향').locator('..')).toContainText('오른쪽');
 await expect(result).toContainText('43.25 °');
 await expect(result).toContainText('20 / 50점');
 await expect(result).toContainText('2 / 24점');
});
