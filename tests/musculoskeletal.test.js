import test from 'node:test';
import assert from 'node:assert/strict';
import {getAssessment,summarize} from '../src/data.js';
import {workflowProgress} from '../src/assessment-workflow.js';
import {clinicalRows,clinicalComplete,clinicalResultTable,mmtGrades,masGrades} from '../src/musculoskeletal.js';
import {recommend,newChart,noteSource} from '../src/charting/engine.js';
import {servicePrintContent,safePhoto} from '../src/charting/service-record.js';
const progress=(a,f)=>workflowProgress(a,f,summarize(a,f.answers,f.fields));
test('ROM, MMT and MAS use unique bilingual fields and have no invented aggregate score',()=>{
 for(const key of ['rom','mmt','tone']){const a=getAssessment(key);assert.equal(a.max,null);assert.equal(new Set(a.fields.map(x=>x.id)).size,a.fields.length);assert.ok(clinicalRows(key).every(row=>row.group.label.includes('(')&&row.move.label.includes('(')));assert.equal(progress(a,{answers:{},fields:{}}).complete,false);}
 assert.ok(mmtGrades.includes('3− (F−)'));assert.ok(mmtGrades.includes('3+ (F+)'));assert.ok(masGrades.includes('1+'));
});
test('Limited does not require an angle or invent one, and unselected regions are outside completion scope',()=>{
 const a=getAssessment('rom'),f={answers:{},fields:{'rom-regions':['knee']}};
 for(const row of clinicalRows('rom').filter(x=>x.group.id==='knee'))for(const side of row.sides)f.fields[row.id+'-'+side]='Full';
 f.fields['rom-knee-flex-left']='Limited';assert.equal(clinicalComplete(a,f),true);assert.equal(progress(a,f).complete,true);assert.equal(progress(a,f).measured,4);assert.equal(progress(a,f).requiredCount,4);assert.equal(f.fields['rom-knee-flex-left-degrees'],undefined);assert.match(clinicalResultTable(a,f),/rowspan="2"/);assert.doesNotMatch(clinicalResultTable(a,f),/180°/);
 f.fields['rom-knee-flex-left-degrees']='-181';assert.equal(progress(a,f).complete,false);f.fields['rom-knee-flex-left-degrees']='115';assert.equal(progress(a,f).complete,true);assert.match(clinicalResultTable(a,f),/Limited 115°/);f.fields['rom-knee-flex-left-degrees']='-10';assert.equal(progress(a,f).complete,true);f.fields['rom-knee-ext-right']='skipped';assert.equal(progress(a,f).complete,false);
});
test('MMT plus/minus and MAS 1+ remain categorical values across completion and printing',()=>{
 for(const [key,grade] of [['mmt','3+ (F+)'],['tone','1+']]){const a=getAssessment(key),f={answers:{},fields:{[key+'-regions']:['knee']}};for(const row of clinicalRows(key).filter(x=>x.group.id==='knee'))for(const side of row.sides)f.fields[row.id+'-'+side]=grade;assert.equal(progress(a,f).complete,true);assert.equal(progress(a,f).total,null);assert.ok(clinicalResultTable(a,f).includes(grade));}
});
test('recommendations return at most three candidates and keep the existing safety gate',()=>{
 const c=newChart(),v={id:'v',date:'2026-10-25',forms:{}},p={identity:{},visits:[v]};c.context={...c.context,capability:'walking',safety:'cleared',equipment:['chair','bed','support','band','walker','step','cup','towel']};assert.equal(recommend(p,v,c).items.length,3);c.context.safety='concern';assert.equal(recommend(p,v,c).items.length,0);
});
test('service print keeps actual performance separate from plans, sanitizes photo sources and avoids copying photo data into review history',()=>{
 const v={id:'v',sequence:1,date:'2026-10-25',forms:{}},p={id:'p',identity:{name:'테스트',birth:'1950-01-01'},visits:[v]},c=newChart(v.date);c.serviceRecord={status:'실시',photos:[{id:'one',data:'data:image/jpeg;base64,YWJj',caption:'실제 운동 사진'}]};const source=noteSource(p,v,c);assert.doesNotMatch(source,/base64/);assert.match(source,/실제 운동 사진/);const output=servicePrintContent(p,v,c,[]);assert.match(output,/실제 수행 기록 없음/);assert.match(output,/실제 운동 사진/);assert.equal(safePhoto('https://public.example/photo.jpg'),'');assert.equal(safePhoto('data:image/svg+xml;base64,YQ=='),'');c.serviceRecord.photos[0].caption='수정';assert.notEqual(noteSource(p,v,c),source);
});

test('non-image and oversized photo uploads are rejected before decoding',async()=>{
 const {compressServicePhoto}=await import('../src/charting/service-record.js');await assert.rejects(compressServicePhoto({type:'text/html',size:10}),/사진 파일/);await assert.rejects(compressServicePhoto({type:'image/png',size:21*1024*1024}),/20MB/);
});
