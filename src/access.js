import {supabase} from './backend.js';
export async function fetchAccess(){const {data,error}=await supabase.rpc('my_access');if(error)throw error;if(!data)throw new Error('이용 권한 설정이 필요합니다.');return data;}
export {allocationIssue,canStoreRecords} from './access-policy.js';
