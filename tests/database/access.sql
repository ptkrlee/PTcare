\set ON_ERROR_STOP on
-- A new sign-up is pending and cannot self-approve through metadata or direct table writes.
insert into auth.users(id,email) values('44444444-4444-4444-8444-444444444444','pending@example.test');
insert into public.platform_admins values('33333333-3333-4333-8333-333333333333');
set role authenticated;
set request.jwt.claim.sub='44444444-4444-4444-8444-444444444444';
do $$declare denied boolean:=false;a jsonb;begin
 a:=public.my_access();assert (a->>'approved')::boolean=false;assert (a->>'patient_limit')::int=1;assert (a->>'visit_limit')::int=8;assert (a->>'is_admin')::boolean=false;
 begin perform public.save_patient_record(gen_random_uuid(),'{}',0,gen_random_uuid());exception when raise_exception then denied:=true;end;assert denied,'pending account wrote records';
 denied:=false;begin update public.therapist_access set approved=true;exception when insufficient_privilege then denied:=true;end;assert denied,'self approval allowed';
 denied:=false;begin insert into public.platform_admins values(auth.uid());exception when insufficient_privilege then denied:=true;end;assert denied,'self admin escalation allowed';
 denied:=false;begin perform public.admin_therapists();exception when insufficient_privilege then denied:=true;end;assert denied,'non-admin viewed accounts';
 denied:=false;begin perform public.admin_patient_records('11111111-1111-4111-8111-111111111111');exception when insufficient_privilege then denied:=true;end;assert denied,'non-admin viewed all records';
 denied:=false;begin perform public.admin_set_access(auth.uid(),true,100,100,'forged');exception when insufficient_privilege then denied:=true;end;assert denied,'non-admin granted tokens';
end;$$;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$declare denied boolean:=false;doc jsonb;v jsonb;begin
 begin perform public.save_patient_record('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','{"id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","schemaVersion":1,"identity":{},"visits":[]}',0,gen_random_uuid());exception when raise_exception then denied:=true;end;assert denied,'second patient was permitted';
 select document into doc from public.patient_records limit 1;
 select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'sequence',i,'forms','{}'::jsonb)) into v from generate_series(1,8) i;
 doc:=jsonb_set(doc,'{visits}',v);perform public.save_patient_record((doc->>'id')::uuid,doc,2,gen_random_uuid());
 denied:=false;begin perform public.save_patient_record((doc->>'id')::uuid,jsonb_set(doc,'{visits}',v||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()))),3,gen_random_uuid());exception when raise_exception then denied:=true;end;assert denied,'ninth visit permitted';
 denied:=false;begin perform public.save_patient_record((doc->>'id')::uuid,jsonb_set(doc,'{visits}','[]'),3,gen_random_uuid());exception when raise_exception then denied:=true;end;assert denied,'old visits deleted to reuse quota';
end;$$;
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
do $$declare denied boolean:=false;a jsonb;begin
 assert (public.my_access()->>'is_admin')::boolean;
 assert jsonb_array_length(public.admin_therapists())=4;
 assert jsonb_array_length(public.admin_patient_records('11111111-1111-4111-8111-111111111111'))=1;
 assert (select count(*) from public.patient_records)=0,'admin own record store exposed other records';
 begin perform public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',3,gen_random_uuid());exception when insufficient_privilege then denied:=true;end;assert denied,'admin edited therapist clinical record';
 perform public.admin_set_access('11111111-1111-4111-8111-111111111111',true,2,10,'two visit credits');
 assert jsonb_array_length(public.admin_access_history('11111111-1111-4111-8111-111111111111'))=1;
 perform public.admin_set_access('44444444-4444-4444-8444-444444444444',true,1,3,'verified therapist','therapist');
 denied:=false;begin perform public.admin_set_access('11111111-1111-4111-8111-111111111111',true,2,5,'');exception when invalid_parameter_value then denied:=true;end;assert denied,'missing grant reason accepted';
end;$$;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$declare doc jsonb;v jsonb;begin
 select document into doc from public.patient_records limit 1;v:=doc->'visits';
 perform public.save_patient_record((doc->>'id')::uuid,jsonb_set(doc,'{visits}',v||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()))),3,gen_random_uuid());
 perform public.save_patient_record('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','{"id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","schemaVersion":1,"identity":{},"visits":[]}',0,gen_random_uuid());
end;$$;
-- Lowering limits prevents additions, but does not destroy or freeze existing clinical records.
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
select public.admin_set_access('11111111-1111-4111-8111-111111111111',true,0,0,'lower limits');
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$declare doc jsonb;begin
 select document into doc from public.patient_records where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 perform public.save_patient_record((doc->>'id')::uuid,jsonb_set(doc,'{identity,name}','"Updated existing"'),4,gen_random_uuid());
end;$$;
reset role;
select 'PASS: signup approval, server quotas, immutable visit slots, read-only admin, grants and audit' as result;
set role anon;
set request.jwt.claim.sub='';
do $$declare denied boolean:=false;begin
 begin perform public.my_access();exception when insufficient_privilege then denied:=true;end;assert denied,'anonymous access lookup permitted';
 denied:=false;begin perform public.admin_therapists();exception when insufficient_privilege then denied:=true;end;assert denied,'anonymous admin enumeration permitted';
end;$$;
reset role;
