import {ageOn} from './clinical-scoring.js';
const number=(v,max=3600)=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&v!=='skipped'&&Number.isFinite(Number(v))&&Number(v)>0&&Number(v)<=max?Number(v):null;
export function chairStandReference(fields={},context={}){
 const time=number(fields['sts-five-time']);if(time===null)return [];
 const age=ageOn(context.birth,context.date),eligible=age!==null&&age>=70&&age<=84&&fields['sts-five-population']==='지역사회 거주 고령자'&&fields['sts-five-arms']==='팔 사용 없이 시행';
 return [{label:'KFACS · 5회 STS 연구 참고',value:eligible?`${time.toFixed(2)}초 · ${time>=12.8?'12.8초 기준 이상':time>=10.8?'10.8초 이상 · 12.8초 미만':'10.8초 기준 미만'}. 한국 70–84세 지역사회 코호트의 10.8초·12.8초 참고 경계값입니다. SPPB 배점이나 낙상 확정 판정과 구분합니다. 초록 근거이며 상세 시행·경계 포함 규칙은 전문 확인이 필요합니다.`:'70–84세·지역사회 거주·팔 사용 없이 시행 조건을 확인하면 KFACS 10.8초·12.8초 연구 참고 경계값을 비교합니다. 다른 연령·조건에 자동 적용하지 않습니다.'}];
}
export function muscleMassReference(fields={}){
 const mass=number(fields['asm-mass'],100),height=number(fields['asm-height'],250),measured=number(fields['asm-index'],50),calculated=mass&&height?mass/(height/100)**2:null;
 const rows=[{label:'ASM / 키² (계산값)',value:calculated!==null?calculated.toFixed(2)+' kg/m²':'계산 전'}];
 // Different indices are not silently averaged or overwritten.
 if(measured!==null&&calculated!==null&&Math.abs(measured-calculated)>0.15)rows.push({label:'지수 대조 필요',value:'장비 지수와 ASM/키² 계산값이 다릅니다. 단위·키·ASM 및 측정일을 확인해 주세요. 참고값 비교는 보류합니다.'});
 const reference=fields['asm-reference'],sex=fields['asm-sex'],index=measured??calculated;
 if(!reference||reference==='적용 안 함')return [...rows,{label:'근감소증 평가',value:'근육량·근력·신체기능을 함께 평가해야 합니다. 근육량 또는 인바디 수치만으로 근감소증 진단을 확정하지 않습니다.'}];
 if(fields['asm-method']!=='DXA'||!['남성','여성'].includes(sex)||index===null||(measured!==null&&calculated!==null&&Math.abs(measured-calculated)>0.15))return [...rows,{label:'근육량 참고값',value:'첨부 2022 종설의 DXA 기준입니다. DXA 측정·성별·유효한 ASM 지수를 확인해야 비교합니다. BIA 결과에 DXA 기준을 적용하지 않습니다.'}];
 if(!['AWGS 2014 · DXA (2022 종설 표1)','EWGSOP2 · DXA (2022 종설 본문)'].includes(reference))return rows;
 const asian=reference==='AWGS 2014 · DXA (2022 종설 표1)',cut=sex==='남성'?7:asian?5.4:5.5,low=asian?index<=cut:index<cut;
 rows.push({label:asian?'AWGS 2014 · DXA 역사적 참고':'EWGSOP2 · DXA 종설 참고',value:`${sex} ${index.toFixed(2)} kg/m² · ${asian?'≤':'<'}${cut} kg/m² 기준 ${low?'해당':'미해당'}. ${asian?'첨부 표1의 2014 기준이며 AWGS 2025 기준이 아닙니다.':'첨부 2022 종설 232쪽 DXA 본문 기준입니다.'} 낮은 근육량 여부의 참고이며 근감소증 확정·배제 결과가 아닙니다.`});
 return rows;
}
