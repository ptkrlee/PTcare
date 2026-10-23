import {bbsTimeValid} from './timed-criteria.js';
import {scoreSPPB} from './clinical-scoring.js';
import { extraAssessments } from './extra-assessments.js';
// Source: user-supplied association activity and satisfaction forms.
// BBS choices follow the attachment, with only spacing/typographic corrections.
const bbsRows = [
  ['앉은 자세에서 일어나기', ['손을 사용하지 않고 독립적으로 일어설 수 있다.', '손을 사용하여 독립적으로 일어설 수 있다.', '여러 번 시도하여 독립적으로 일어설 수 있다.', '서기에 있어서 최소 도움(25%)이 필요하다.', '서기에 있어서 보통 도움 또는 최대 도움이 필요하다.']],
  ['도움 없이 서 있기', ['안전하게 2분 동안 서 있을 수 있다.', '감독하에 2분 동안 서 있을 수 있다.', '도움 없이 30초간 서 있을 수 있다.', '도움 없이 30초간 서 있기 위해 여러 번 시도해야 한다.', '도움 없이 30초간 서 있을 수 없다.']],
  ['기대지 않고 스스로 앉기', ['안전하게 2분 동안 앉아 있을 수 있다.', '감독하에 2분 동안 앉아 있을 수 있다.', '30초 동안 앉아 있을 수 있다.', '10초간 앉아 있을 수 있다.', '10초간 지지 없이 앉아 있을 수 없다.']],
  ['선 상태에서 앉기', ['양손을 최소한으로 사용하여 안전하게 앉을 수 있다.', '양손을 사용하여 앉기 조절이 가능하다.', '양다리를 의자에 기대어 앉기 조절이 가능하다.', '독립적으로 앉지만 털썩 주저앉는다.', '앉기에 도움이 필요하다.']],
  ['의자에서 의자로 이동하기', ['양손을 최소한으로 사용하여 안전하게 이동할 수 있다.', '양손을 적절히 사용하여 안전하게 이동할 수 있다.', '구두 지시나 감독하에 이동할 수 있다.', '1명의 도움이 필요하다.', '안전을 위해 2명의 도움이 필요하다.']],
  ['눈 감고 서 있기', ['안전하게 10초간 서 있을 수 있다.', '감독하에 10초간 서 있을 수 있다.', '3초간 서 있을 수 있다.', '눈을 감은 채 3초간 유지하기 어렵다.', '넘어지는 것을 방지하기 위해 도움이 필요하다.']],
  ['양발을 모으고 서 있기', ['독립적으로 양발을 모으고 안전하게 1분간 서 있을 수 있다.', '독립적으로 양발을 모으고 감독하에 1분간 서 있을 수 있다.', '독립적으로 양발을 모으고 30초간 서 있을 수 있다.', '자세 유지에 도움이 필요하지만 15초간 서 있을 수 있다.', '자세 유지에 도움이 필요하고 15초간 서 있을 수 없다.']],
  ['선 자세에서 팔을 펴고 뻗기', ['25cm(10인치) 이상 앞으로 뻗을 수 있다.', '12.5cm(5인치) 이상 안전하게 앞으로 뻗을 수 있다.', '5cm(2인치) 이상 안전하게 앞으로 뻗을 수 있다.', '앞으로 뻗을 수 있지만 감독이 필요하다.', '시도하는 동안 균형을 잃고 외부의 도움이 필요하다.']],
  ['선 상태에서 바닥의 물건 집어 올리기', ['쉽고 안전하게 슬리퍼를 주울 수 있다.', '슬리퍼를 주울 수 있지만 감독이 필요하다.', '균형을 유지하고 슬리퍼로부터 2~5cm까지 접근할 수 있지만 주울 수 없다.', '시도하는 동안 도움이 필요하며 주울 수 없다.', '시도할 수 없다.']],
  ['선 자세에서 양쪽 어깨 너머로 뒤돌아보기', ['체중 이동을 잘하며 양쪽 어깨 너머로 뒤돌아볼 수 있다.', '한쪽은 가능하나 반대쪽은 체중 이동이 잘되지 않는다.', '옆으로 돌아보기까지만 균형 유지가 가능하다.', '돌아볼 때 감독이 필요하다.', '돌아보기 위해 도움이 필요하다.']],
  ['360° 회전하기', ['양쪽을 4초 내에 360° 돌 수 있다.', '한쪽을 4초 내에 360° 돌 수 있다.', '감독 없이 천천히 안전하게 돌 수 있다.', '감독이 필요하다.', '도움이 필요하다.']],
  ['선 자세에서 발판에 양발을 교대로 놓기', ['발판에 8번 오르내리기를 20초 이내에 한다.', '발판에 8번 오르내리기에 20초 이상 걸린다.', '감독하에 도움 없이 4번 오르내릴 수 있다.', '최소한의 도움으로 2번 오르내릴 수 있다.', '시도할 수 없다.']],
  ['한 발을 다른 발 앞에 놓고 지지 없이 서 있기', ['30초간 독립적으로 한 발을 다른 발 앞에 일자로 놓을 수 있다.', '30초간 독립적으로 한 발을 다른 발 앞에 놓을 수 있다.', '30초 동안 유지가 가능하며 독립적으로 작은 발 놓기를 할 수 있다.', '15초간 유지가 가능하나 발 놓을 때 도움이 필요하다.', '발 놓기 및 서 있는 동안 균형을 잃는다.']],
  ['한 발로 서 있기', ['독립적으로 10초 이상 유지하며 한 발 서기를 할 수 있다.', '독립적으로 5~10초간 유지하며 한 발 서기를 할 수 있다.', '독립적으로 3초 또는 그 이상 유지하며 한 발 서기를 할 수 있다.', '한 발을 들려고 시도하고 한 발로 설 수 있지만 3초간 유지할 수 없다.', '넘어짐을 방지하기 위해 도움이 필요하며 서 있을 수 있다.']],
];
const levels = ['과제를 수행할 수 없음', '최대의 도움이 필요함', '중등도의 도움이 필요함', '최소의 도움이나 감시가 필요함', '완전히 독립적으로 수행함'];
const mbiRows = [['개인위생',5],['목욕하기',5],['식사하기',10],['용변처리',10],['계단 오르기',10],['옷 입기',10],['대변조절',10],['소변조절',10],['보행',15],['의자/침대 이동',15]];
const weights = {5:[0,1,3,4,5],10:[0,2,5,8,10],15:[0,3,8,12,15]};
const satisfaction = [
  '서비스에 대해 전반적으로 만족한다.',
  '서비스를 통해 건강관리 능력이 향상되었다.',
  '활동가를 통해 가정환경에 맞춘 맞춤형 지도가 이루어졌다.',
  '활동가와 의사소통이 잘 이루어졌다.',
  '활동가와 시간 약속이 잘 지켜졌다.',
  '건강상태에 맞춰 적절하게 방문운동이 이루어졌다.',
  '서비스를 통해 신체적 능력 향상과 인지 및 일상생활활동에 도움을 주었다.',
  '서비스를 통해 가정 내 환경(안전, 동선, 돌봄부담 등)이 개선되었다.',
  '다른 돌봄 대상자에게도 서비스를 소개하고 싶다.',
  '가족 및 주변 사람들이 방문운동 서비스의 중요성을 이해하는 데 도움이 되었다.',
];
export const assessments = {
  ...extraAssessments,
  bbs: { code:'BBS', title:'균형 및 낙상 위험 검사', english:'Berg Balance Scale', short:'균형 · 낙상 위험', description:'일상 속 움직임으로 균형 능력을 살펴봅니다.', max:56, unit:'14문항 · 문항당 0–4점', items:bbsRows.map(([title,labels],i)=>({id:`bbs-${i}`,title,options:labels.map((label,j)=>({label,score:4-j})),note:i===1?'원문 안내: 2분 동안 서 있기가 가능하면 3번은 4점으로 채점하고 4번을 실시합니다. 3번 점수는 평가자가 직접 선택해 주세요.':null})) },
  mbi: { code:'MBI', title:'일상생활동작 수행 능력', english:'Modified Barthel Index', short:'일상생활 수행 능력', description:'일상생활에서 필요한 도움의 정도를 확인합니다.', max:100, unit:'10문항 · 항목별 배점', items:mbiRows.map(([title,max],i)=>({id:`mbi-${i}`,title,options:levels.map((label,j)=>({label,score:weights[max][j]}))})) },
  satisfaction: { code:'만족도', title:'방문운동 서비스 만족도', english:'Service Satisfaction Survey', short:'서비스 만족도', description:'더 나은 방문운동을 위해 경험을 돌아봅니다.', max:50, unit:'10문항 · 문항당 1–5점', items:satisfaction.map((title,i)=>({id:`satisfaction-${i}`,title,options:['매우 그렇지 않다','그렇지 않다','보통','그렇다','매우 그렇다'].map((label,j)=>({label,score:j+1}))})) },
};
export function getAssessment(key, mobility='walking') {
  const base=assessments[key];
  if(key!=='mbi'||mobility!=='wheelchair') return base;
  return {...base,max:90,items:base.items.map((item,i)=>i===8?{...item,title:'의자차(휠체어)',options:levels.map((label,j)=>({label,score:weights[5][j]}))}:item)};
}
export function summarize(assessment, answers={}, fields={}) {
  const effective={...answers},automatic={};
  if(assessment.code==='SPPB'){
   for(const [id,result] of Object.entries(scoreSPPB(fields))){effective[id]=result.score===null?(result.skipped?'skipped':undefined):result.score;automatic[id]={...result,active:true};}
  }
  if(['MoCA-K','K-MoCA'].includes(assessment.code)){
   const key=assessment.code==='MoCA-K'?'moca-k':'moca-k2';
   for(const [fieldId,itemId,convert] of [[`${key}-fluency-count`,`${key}-fluency`,n=>n>=(key==='moca-k'?11:6)?1:0],[`${key}-serial7-correct`,`${key}-serial7`,n=>n>=4?3:n>=2?2:n===1?1:0],[`${key}-vigilance-errors`,`${key}-vigilance`,n=>n<=1?1:0]]){
    const value=fields[fieldId],field=assessment.fields.find(f=>f.id===fieldId);
    if(value!==undefined&&value!==null&&value!==''){
     const valid=value!=='skipped'&&Number.isInteger(Number(value))&&Number(value)>=field.min&&Number(value)<=field.max;
     effective[itemId]=value==='skipped'?'skipped':valid?convert(Number(value)):undefined;
     automatic[itemId]={active:true,score:valid?effective[itemId]:null,reason:valid?`${field.label}: ${value}개 → ${effective[itemId]}점`:'측정값 미평가 또는 입력 확인 필요'};
    }
   }
   const recallStatus=fields[`${key}-recall-status`];
   if(recallStatus){for(let i=0;i<5;i++){
    const itemId=`${key}-recall-${i}`,method=fields[`${key}-cue-${i}`];
    const deferred=['미실시','skipped'].includes(recallStatus)||['미실시','skipped'].includes(method);
    const valid=recallStatus==='실시함'&&['단서 없이 회상','범주 단서 후 회상','선다형 단서 후 회상','회상 못함'].includes(method);
    effective[itemId]=deferred?'skipped':valid?(method==='단서 없이 회상'?1:0):undefined;
    automatic[itemId]={active:true,score:valid?effective[itemId]:null,reason:deferred?'미평가 · 총점 미확정':valid?`${method} → ${effective[itemId]}점`:'회상 방법을 선택해 주세요.'};
   }}
  }
  const selected=assessment.items.map(item=>({item,skipped:effective[item.id]==='skipped',option:item.options.find(o=>o.score===effective[item.id])}));
  const raw=selected.reduce((sum,row)=>sum+(row.option?.score??0),0);
  const education=fields['moca-k-education'];
  const educationKnown=education!==''&&education!=null&&Number.isInteger(Number(education))&&Number(education)>=0&&Number(education)<=40;
  const adjustment=assessment.code==='MoCA-K'&&educationKnown&&Number(education)<=6?1:0;
  const total=assessment.max===null?null:Math.min(assessment.max,raw+adjustment);
  return {raw,adjustment,total,educationKnown,answers:effective,automatic,skipped:selected.filter(row=>row.skipped).length,answered:selected.filter(row=>row.option!==undefined).length,complete:assessment.items.length>0&&selected.every(row=>row.option!==undefined)&&(assessment.code!=='MoCA-K'||educationKnown)&&(assessment.code!=='BBS'||assessment.items.every(item=>bbsTimeValid(item,{answers,fields}))),selected};
}
