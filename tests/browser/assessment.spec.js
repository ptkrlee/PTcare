import {test,expect} from '@playwright/test';
async function identity(page){
  await page.locator('#person-name').fill('홍길동');
  await page.locator('#person-date').fill('2026-10-19');
  await page.locator('#person-birth').fill('1950-03-15');
}
async function answer(page,index){
  for(const item of await page.locator('.question-card').all()) await item.locator('input[type=radio]').nth(index).check();
}

test('BBS full assessment, correction, result details, returning and refresh privacy',async({page})=>{
  await page.goto('/');await identity(page);await answer(page,0);
  await expect(page.locator('[data-total]')).toHaveText('56');
  await page.locator('#bbs-0-4').check();
  await expect(page.locator('[data-total]')).toHaveText('52');
  await page.locator('.result-button').first().click();
  await expect(page.locator('#result-heading')).toHaveText('균형 및 낙상 위험 검사');
  await expect(page.locator('.result-score strong')).toHaveText('52');
  await expect(page.locator('.result-person')).toContainText('홍길동');
  await expect(page.locator('.result-table tbody tr')).toHaveCount(14);
  await page.locator('#back').click();
  await expect(page.locator('#bbs-0-4')).toBeChecked();
  await page.reload();
  await expect(page.locator('#person-name')).toHaveValue('');
  await expect(page.locator('[data-total]')).toHaveText('0');
  expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
});
test('incomplete forms cannot become final results, zero score can',async({page})=>{
  await page.goto('/');
  await page.locator('.result-button').first().click();
  await expect(page.locator('.result-sheet')).toHaveCount(0);
  await identity(page);
  await page.locator('.result-button').first().click();
  await expect(page.getByRole('alert')).toBeVisible();
  await answer(page,4);
  await page.locator('.result-button').first().click();
  await expect(page.locator('.result-score strong')).toHaveText('0');
});
test('MBI weighted scoring, mobility switching and separate tab state',async({page})=>{
  await page.goto('/');await identity(page);
  await page.locator('#bbs-0-0').check();
  await page.locator('[data-tab=mbi]').click();await answer(page,4);
  await expect(page.locator('[data-total]')).toHaveText('100');
  await page.locator('#mobility').selectOption('wheelchair');
  await expect(page.locator('[data-total]')).toHaveText('85');
  await expect(page.locator('[data-progress-text]')).toContainText('9 / 10');
  await page.locator('#mbi-8-4').check();
  await expect(page.locator('[data-total]')).toHaveText('90');
  await page.locator('.result-button').first().click();
  await expect(page.locator('.result-score')).toContainText('/ 90점');
  await expect(page.locator('.result-table tbody tr')).toHaveCount(10);
  await page.locator('#back').click();
  await page.locator('[data-tab=bbs]').click();
  await expect(page.locator('[data-total]')).toHaveText('4');
  await expect(page.locator('#person-name')).toHaveValue('홍길동');
});
test('satisfaction survey, safe text rendering, reset scope and print output',async({page})=>{
  await page.goto('/');await identity(page);
  await page.locator('#bbs-0-0').check();
  await page.locator('[data-tab=satisfaction]').click();await answer(page,4);
  await page.locator('#person-name').fill('<img src=x onerror=alert(1)>');
  await page.locator('#comment').fill('방문운동이 도움이 되었습니다.\n다음에도 참여하고 싶어요.');
  await expect(page.locator('[data-total]')).toHaveText('50');
  await page.locator('.result-button').first().click();
  await expect(page.locator('.result-person')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.result-person img')).toHaveCount(0);
  await expect(page.locator('.result-comment')).toContainText('다음에도 참여하고 싶어요.');
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.result-toolbar')).toBeHidden();
  await page.pdf({path:'/tmp/ptcare-satisfaction.pdf',format:'A4'});
  await page.emulateMedia({media:'screen'});
  await page.locator('#back').click();
  await page.locator('.reset-button:visible').first().click();await page.locator('#cancel-reset').click();
  await expect(page.locator('[data-total]')).toHaveText('50');
  await page.locator('.reset-button:visible').first().click();await page.locator('#confirm-reset').click();
  await expect(page.locator('[data-total]')).toHaveText('0');
  await expect(page.locator('#comment')).toHaveValue('');
  await page.locator('[data-tab=bbs]').click();
  await expect(page.locator('[data-total]')).toHaveText('4');
});
test('mobile selections and capture sheet have no horizontal overflow or data transmission',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const outbound=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))outbound.push(r.url());});
  await page.goto('/');await identity(page);await answer(page,0);
  await expect(page.locator('.mobile-score')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/ptcare-mobile.png',fullPage:false});
  await page.locator('.mobile-score .result-button').click();
  await expect(page.locator('.result-score strong')).toHaveText('56');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/ptcare-mobile-result.png',fullPage:true});
  await page.locator('#back').click();
  await page.locator('.mobile-reset').click();
  await page.locator('#confirm-reset').click();
  await expect(page.locator('[data-mobile-total]')).toHaveText('0');
  expect(outbound).toEqual([]);
});
