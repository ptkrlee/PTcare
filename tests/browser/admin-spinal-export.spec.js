import {execFileSync} from 'node:child_process';
import {test,expect} from '@playwright/test';
import {mockCloud,login} from './mock-cloud.js';

test('administrator downloads a workbook with structured spinal results across therapists',async({page,context},testInfo)=>{
 const cloud=mockCloud();
 const therapistIds=[...cloud.access.values()].filter(member=>['therapist@example.test','other@example.test'].includes(member.email)).map(member=>member.user_id);
 for(const [index,owner_id] of therapistIds.entries()){
  const id=crypto.randomUUID();
  const visit=(sequence,fields)=>({id:crypto.randomUUID(),sequence,date:'2026-10-23',forms:{
   'spinal-asymmetry':{fields,answers:{},note:'비공개 평가 메모'},
  }});
  const visits=[visit(1,{
   'sca-cca-1':String(index*17),'sca-cca-1-direction':'오른쪽','sca-cover-number':'PRIVATE-1234',
   'sca-rmdq-confirmed':'모든 문항을 확인함',
  })];
  if(index===0)visits.push(visit(2,{'sca-pain-neck':'6'}),visit(3,{}));
  cloud.rows.set(id,{id,owner_id,revision:1,document:{id,identity:{name:'비공개 환자',birth:'1963-02-04'},visits}});
 }
 await cloud.attach(context);

 await login(page,'therapist@example.test');
 await expect(page.getByRole('link',{name:'관리자',exact:true})).toHaveCount(0);
 await page.locator('#logout').click();

 await login(page,'admin@example.test');
 await page.getByRole('link',{name:'관리자',exact:true}).click();
 const downloaded=page.waitForEvent('download');
 await page.getByRole('button',{name:'척추비대칭평가 Excel 다운로드'}).click();
 const download=await downloaded;
 expect(download.suggestedFilename()).toBe('PTcare-척추비대칭평가.xlsx');
 const file=testInfo.outputPath(download.suggestedFilename());
 await download.saveAs(file);
 await expect(page.locator('#spinal-export-status')).toHaveText('3회차 결과를 다운로드했습니다.');

 const result=execFileSync('unzip',['-p',file,'xl/worksheets/sheet1.xml'],{encoding:'utf8'});
 const workbook=execFileSync('unzip',['-p',file,'xl/workbook.xml'],{encoding:'utf8'});
 const strings=execFileSync('unzip',['-p',file,'xl/sharedStrings.xml'],{encoding:'utf8'});
 expect(workbook).toContain('변수 설명');
 expect(result.match(/<row\s/g)).toHaveLength(4);
 expect(result).toContain('<v>17</v>');
 expect(result).toMatch(/<c r="[^"]+"(?: t="n")?><v>0<\/v><\/c>/);
 expect(strings).toContain('RMDQ 총점');
 expect(strings).not.toMatch(/비공개|PRIVATE-1234|1963-02-04|2026-10-23|@example\.test/);
});
