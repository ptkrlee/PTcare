// Criterion confirmation is distinct from an observed duration. Never persist an
// assumed duration or derive speed from a checked criterion.
export const modeKey=id=>id+'-criterion';
export function timedCriterion(id,fields={}){
 if(['sppb-side','sppb-semi','sppb-tandem'].includes(id))return {limit:10,direction:'at-least',pass:'통과 · 10초 유지',fail:'10초 미만 · 실제 시간 필수'};
 if(id==='sppb-chair-time')return {limit:11.19,direction:'at-most',pass:'최상위 시간 기준 충족 · 11.19초 이하',fail:'11.19초 초과 · 실제 시간 필수'};
 if(['sppb-gait-1','sppb-gait-2'].includes(id)){const limit=Number(fields['sppb-distance']??4)===3?3.62:4.82;return {limit,direction:'less',pass:`최상위 시간 기준 충족 · ${limit}초 미만`,fail:`${limit}초 이상 · 실제 시간 필수`};}
 if(id.startsWith('ols-')){const limit=id.includes('open')?30:10;return {limit,direction:'at-least',pass:`통과 · ${limit}초 이상`,fail:`${limit}초 미만 · 실제 시간 필수`};}
 return null;
}
export const meetsCriterion=(n,c)=>c.direction==='at-least'?n>=c.limit:c.direction==='at-most'?n<=c.limit:n<c.limit;
export function criterionState(id,fields={}){
 const c=timedCriterion(id,fields),mode=fields[modeKey(id)],raw=fields[id];
 const present=raw!==''&&raw!==null&&raw!==undefined;
 const n=present&&raw!=='skipped'?Number(raw):NaN;
 const numeric=Number.isFinite(n)&&n>=0&&(!id.startsWith('sppb-gait')&&id!=='sppb-chair-time'||n>0)&&n<=(['sppb-side','sppb-semi','sppb-tandem'].includes(id)?10:3600)&&Math.abs(n*100-Math.round(n*100))<1e-6;
 if(!c||!['passed','below'].includes(mode))return {active:false};
 if(raw==='skipped')return {active:false};
 if(mode==='passed'&&!present)return {active:true,valid:true,confirmed:true,criterion:c};
 if(!numeric)return {active:true,valid:false,reason:'실제 시간을 입력하세요.',criterion:c};
 if((mode==='passed')!==meetsCriterion(n,c))return {active:true,valid:false,reason:'선택한 기준과 실제 시간이 다릅니다. 선택 또는 시간을 확인하세요.',criterion:c};
 return {active:true,valid:true,confirmed:mode==='passed',actual:n,criterion:c};
}
// Full BBS performance choices also include safety/help/position criteria.
// Selecting the top choice confirms ALL of its criteria, not just its duration.
export const bbsTimed={
 'bbs-1':{limit:120},'bbs-2':{limit:120},'bbs-5':{limit:10},'bbs-6':{limit:60},
 'bbs-10':{limit:4,direction:'at-most',bilateral:true},'bbs-11':{limit:20,direction:'at-most'},
 'bbs-12':{limit:30},'bbs-13':{limit:10}
};
export function bbsTimeValid(item,form){
 const rule=bbsTimed[item.id],answer=form.answers[item.id];if(!rule||!Number.isInteger(answer))return true;
 const ids=rule.bilateral?[item.id+'-seconds-right',item.id+'-seconds-left']:[item.id+'-seconds'];
 if(form.fields[item.id+'-time-required']!=='required'&&ids.every(id=>form.fields[id]===undefined||form.fields[id]===''))return true;
 return ids.every(id=>{const raw=form.fields[id];if((raw==null||raw==='')&&answer===4)return true;const n=Number(raw);if(raw==null||raw===''||raw==='skipped'||!Number.isFinite(n)||n<0||n>3600||Math.abs(n*100-Math.round(n*100))>1e-6)return false;if(answer===4&&rule.direction==='at-most'&&n===0)return false;return answer!==4||meetsCriterion(n,{...rule,direction:rule.direction||'at-least'});});
}
