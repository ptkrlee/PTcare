\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$declare r public.patient_records; denied boolean; begin
 select * into r from public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","schemaVersion":1,"identity":{"name":"Fictional A"},"visits":[]}',0,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 assert r.revision=1 and r.owner_id=auth.uid(),'own create failed';
 select * into r from public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","schemaVersion":1,"identity":{"name":"Fictional A updated"},"visits":[]}',1,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 assert r.revision=2,'revision did not increment';
 select * into r from public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',1,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 assert r.revision=2,'idempotent retry changed revision';
 denied:=false;begin
  perform public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',1,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 exception when serialization_failure then denied:=true;end;assert denied,'stale update was allowed';
 denied:=false;begin
  update public.patient_records set revision=99;
 exception when insufficient_privilege then denied:=true;end;assert denied,'direct update bypassed revision';
 denied:=false;begin
  perform public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',2,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 exception when check_violation then denied:=true;end;assert denied,'malformed document accepted';
 assert (select count(*) from public.patient_records)=1,'owner read failed';
end;$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$declare denied boolean:=false;begin
 assert (select count(*) from public.patient_records)=0,'another therapist can read records';
 begin
  perform public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',2,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 exception when insufficient_privilege then denied:=true;end;assert denied,'another therapist can overwrite records';
end;$$;
set role anon;
set request.jwt.claim.sub='';
do $$declare denied boolean:=false;begin
 begin perform count(*) from public.patient_records;exception when insufficient_privilege then denied:=true;end;assert denied,'anonymous read allowed';
 denied:=false;begin
  perform public.save_patient_record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',2,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
 exception when insufficient_privilege then denied:=true;end;assert denied,'anonymous save allowed';
end;$$;
reset role;
select 'PASS: ownership, RLS, anonymous denial, direct-write denial, optimistic concurrency, idempotency, document validation' as result;
