export const canStoreRecords=access=>!!access?.approved&&(access.member_type||'therapist')==='therapist';
export function allocationIssue(access,documents,patientId){
 if(!canStoreRecords(access))return '관리자의 치료사 승인 후 이용할 수 있습니다.';
 if(patientId){const patient=documents.find(p=>p.id===patientId);if(!patient)return '대상자를 찾을 수 없습니다.';if(patient.visits.length>=access.visit_limit)return `이 대상자는 최대 ${access.visit_limit}회차까지 이용할 수 있습니다. 기존 회차를 이어서 작성하거나 관리자에게 추가 이용권을 요청해 주세요.`;}
 else if(documents.length>=access.patient_limit)return `대상자는 최대 ${access.patient_limit}명까지 저장할 수 있습니다. 관리자에게 추가 이용권을 요청해 주세요.`;
 return '';
}
