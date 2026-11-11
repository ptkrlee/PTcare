import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenarioExercises,scenarioMethods} from '../src/charting/scenario-exercises.js';
import {exercises,newChart,newPlanItem,newPerformedItem,recommend} from '../src/charting/engine.js';
test('ten PDF movements enrich three stable IDs and add seven manually reviewed exercises',()=>{
 assert.equal(Object.keys(scenarioMethods).length,10);assert.equal(scenarioExercises.length,7);
 for(const id of ['01-01','01-02','01-06'])assert.ok(scenarioMethods[id]);
 for(const item of scenarioExercises){assert.ok(exercises.find(x=>x.id===item.id)?.manualOnly);assert.equal(newPlanItem(item.id).reps,'10');assert.equal(newPlanItem(item.id).sets,'3');assert.equal(newPlanItem(item.id).seconds,'3');assert.equal(newPlanItem(item.id).method,'');assert.equal(newPerformedItem(item.id).method,'');assert.equal(newPerformedItem(item.id).reps,'');}
 const chart=newChart('2026-11-10'),visit={id:'v',date:'2026-11-10',sequence:1,forms:{}},patient={identity:{birth:'1950-01-01'},visits:[visit]};chart.context={...chart.context,capability:'outdoor',safety:'cleared',equipment:['bed','chair','support','towel'],goals:['침상 이동']};assert.ok(recommend(patient,visit,chart).items.every(ex=>!ex.manualOnly));
 assert.match(scenarioMethods['01-11'].dose,/5초/);assert.match(scenarioMethods['01-14'].dose,/4세트/);assert.match(scenarioMethods['01-17'].cue,/고난도/);
});
test('90 proposals retain ten per category and only approved rows map to the live catalog',()=>{
 const rows=JSON.parse(fs.readFileSync(new URL('../docs/exercise-candidates-90.json',import.meta.url),'utf8'));
 assert.equal(rows.length,90);assert.equal(new Set(rows.map(x=>x.id)).size,90);
 for(let g=1;g<=9;g++)assert.equal(rows.filter(x=>x.id.startsWith('P'+String(g).padStart(2,'0')+'-')).length,10);
 for(const row of rows){assert.ok(row.caution&&row.references);assert.match(row.evidence,/원문 대조 대기/);assert.ok(!exercises.some(ex=>ex.id===row.id));const match=exercises.find(ex=>ex.approval?.proposalId===row.id);assert.equal(!!match,!!row.exerciseId);if(match)assert.equal(match.id,row.exerciseId);}
});
