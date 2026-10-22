import {publicProject} from './public-project.js';
import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL||publicProject.url;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||publicProject.publishableKey;
export const configured=!!(url&&key&&url.startsWith('https://')&&!url.includes('YOUR_PROJECT'));
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export class CloudBackend{
 constructor(client){this.client=client;}
 async list(){const {data,error}=await this.client.from('patient_records').select('*').order('updated_at',{ascending:false});if(error)throw error;return data;}
 async save(record){
  const {data,error}=await this.client.rpc('save_patient_record',{p_id:record.document.id,p_document:record.document,p_expected_revision:record.revision,p_change_id:record.changeId});
  if(error)throw error;if(!data?.[0])throw new Error('저장 결과를 확인할 수 없습니다.');return data[0];
 }
}
