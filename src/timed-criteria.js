// Criterion confirmation is distinct from an observed duration. Never persist an
// assumed duration or derive speed from a checked criterion.
export const modeKey=id=>id+'-criterion';
export function timedCriterion(id,fields={}){
 if(['sppb-side','sppb-semi','sppb-tandem'].includes(id))return {limit:10,direction:'at-least',pass:'통과 · 10초 유지',fail:'10초 미만 · 시간 선택 입력'};
 if(id==='sppb-chair-time')return {limit:11.19,direction:'at-most',pass:'최상위 시간 기준 충족 · 11.19초 이하',fail:'11.19초 초과 · 실제 시간 필수'};
 if(['sppb-gait-1','sppb-gait-2'].includes(id)){const limit=Number(fields['sppb-distance']??4)===3?3.62:4.82;return {limit,direction:'less',pass:`최상위 시간 기준 충족 · ${limit}초 미만`,fail:`${limit}초 이상 · 실제 시간 필수`};}
 if(id.startsWith('ols-')){const limit=id.includes('open')?30:10;return {limit,direction:'at-least',pass:`통과 · ${limit}초 이상`,fail:`${limit}초 미만 · 시간 선택 입력`};}
 return null;
}
export function timeBands(id,fields={}){
 if(id==='sppb-tandem')return [{value:'range-1',label:'3초 이상–10초 미만 · 1점',score:1,min:3,max:10,maxOpen:true},{value:'range-0',label:'3초 미만 · 0점',score:0,min:0,max:3,maxOpen:true}];
 if(id==='sppb-gait-1'||id==='sppb-gait-2'){const three=Number(fields['sppb-distance']??4)===3;return [{value:'range-3',label:(three?'3.62–4.65':'4.82–6.20')+'초 · 3점',score:3,min:three?3.62:4.82,max:three?4.66:6.21,maxOpen:true},{value:'range-2',label:(three?'4.66–6.52':'6.21–8.70')+'초 · 2점',score:2,min:three?4.66:6.21,max:three?6.52:8.70},{value:'range-1',label:(three?'6.52':'8.70')+'초 초과 · 1점',score:1,min:three?6.52:8.70,minOpen:true,max:3600}];}
 if(id==='sppb-chair-time')return [{value:'range-3',label:'11.20–13.69초 · 3점',score:3,min:11.20,max:13.70,maxOpen:true},{value:'range-2',label:'13.70–16.69초 · 2점',score:2,min:13.70,max:16.70,maxOpen:true},{value:'range-1',label:'16.70–60초 · 1점',score:1,min:16.70,max:60},{value:'range-0',label:'60초 초과 · 0점',score:0,min:60,minOpen:true,max:3600}];
 return [];
}
export const timeRequired=(id,fields={})=>fields[modeKey(id)]==='measured'||fields[modeKey(id)]==='below'&&!(id==='sppb-side'||id==='sppb-semi'||id.startsWith('ols-'));
export function timedChoices(id,fields={}){const c=timedCriterion(id,fields);if(!c)return [];const bands=timeBands(id,fields);return [['passed',c.pass],...bands.map(b=>[b.value,b.label]),...(!bands.length||fields[modeKey(id)]==='below'?[['below',bands.length?'구간 미정 · 실제 시간 필수':c.fail]]:[]),['measured','실제 시간으로 채점']];}
export const meetsCriterion=(n,c)=>c.direction==='at-least'?n>=c.limit:c.direction==='at-most'?n<=c.limit:n<c.limit;
export function criterionState(id,fields={}){
 const c=timedCriterion(id,fields),mode=fields[modeKey(id)],raw=fields[id];
 const present=raw!==''&&raw!==null&&raw!==undefined;
 const n=present&&raw!=='skipped'?Number(raw):NaN;
 const numeric=Number.isFinite(n)&&n>=0&&(!id.startsWith('sppb-gait')&&id!=='sppb-chair-time'||n>0)&&n<=(['sppb-side','sppb-semi','sppb-tandem'].includes(id)?10:3600)&&Math.abs(n*100-Math.round(n*100))<1e-6;
 const band=timeBands(id,fields).find(b=>b.value===mode),coarseBelow=mode==='below'&&!timeRequired(id,fields);
 if(!c||!['passed','below'].includes(mode)&&!band)return {active:false};
 if(raw==='skipped')return {active:false};
 if(!present&&(mode==='passed'||band||coarseBelow))return {active:true,valid:true,confirmed:mode==='passed',criterion:c,bandScore:band?.score??(mode==='passed'?(['sppb-side','sppb-semi'].includes(id)?1:id==='sppb-tandem'?2:id.startsWith('sppb-')?4:undefined):0),bandLabel:band?.label||(mode==='passed'?c.pass:c.fail)};
 if(!numeric)return {active:true,valid:false,reason:present?'실제 시간의 허용 범위와 소수 둘째 자리까지 입력을 확인하세요.':'실제 시간을 입력하세요.',criterion:c};
 if(band?!(n>=band.min&&(!band.minOpen||n>band.min)&&n<=band.max&&(!band.maxOpen||n<band.max)):(mode==='passed')!==meetsCriterion(n,c))return {active:true,valid:false,reason:'선택한 기준과 실제 시간이 다릅니다. 선택 또는 시간을 확인하세요.',criterion:c};
 return {active:true,valid:true,confirmed:mode==='passed',actual:n,criterion:c};
}
// Full BBS performance choices also include safety/help/position criteria.
// Selecting a performance choice confirms the conditions stated by that option.
// Exact durations are optional; supplied values are still validated.
export const bbsTimed={
 'bbs-1':{limit:120},'bbs-2':{limit:120},'bbs-5':{limit:10},'bbs-6':{limit:60},
 'bbs-10':{limit:4,direction:'at-most',bilateral:true},'bbs-11':{limit:20,direction:'at-most'},
 'bbs-12':{limit:30},'bbs-13':{limit:10}
};
export function bbsTimeValid(item,form){
 const rule=bbsTimed[item.id],answer=form.answers[item.id];if(!rule||!Number.isInteger(answer))return true;
 const ids=rule.bilateral?[item.id+'-seconds-right',item.id+'-seconds-left']:[item.id+'-seconds'];
 if(form.fields[item.id+'-time-required']!=='required'&&ids.every(id=>form.fields[id]===undefined||form.fields[id]===''))return true;
 return ids.every(id=>{const raw=form.fields[id];if(raw==null||raw===''||raw==='skipped')return true;const n=Number(raw);if(raw==null||raw===''||raw==='skipped'||!Number.isFinite(n)||n<0||n>3600||Math.abs(n*100-Math.round(n*100))>1e-6)return false;if(answer===4&&rule.direction==='at-most'&&n===0)return false;return answer!==4||meetsCriterion(n,{...rule,direction:rule.direction||'at-least'});});
}
