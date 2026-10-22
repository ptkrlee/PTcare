\set ON_ERROR_STOP on
-- Forged signup metadata cannot grant approval, quotas or admin rights.
insert into auth.users(id,email,raw_user_meta_data) values('77777777-7777-4777-8777-777777777777','general@example.test','{"member_type":"admin","approved":true,"patient_limit":999}');
set role authenticated;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$declare a jsonb;denied boolean:=false;begin
 a:=public.my_access();assert a->>'member_type'='general';assert (a->>'approved')::boolean=false;assert (a->>'patient_limit')::int=1;assert (a->>'is_admin')::boolean=false;
 begin perform public.save_patient_record(gen_random_uuid(),'{}',0,gen_random_uuid());exception when raise_exception then denied:=true;end;assert denied,'general member saved clinical data';
 perform public.submit_access_request('88888888-8888-4888-8888-888888888888','verification',0,'Please verify fictional qualification');
 perform public.submit_access_request('88888888-8888-4888-8888-888888888888','verification',0,'Please verify fictional qualification');
 assert jsonb_array_length(public.my_access_requests())=1,'retry duplicated request';
 denied:=false;begin perform public.submit_access_request(gen_random_uuid(),'verification',0,'duplicate pending request');exception when raise_exception then denied:=true;end;assert denied,'duplicate pending request allowed';
 denied:=false;begin perform public.admin_resolve_access_request('88888888-8888-4888-8888-888888888888','approved','self approve');exception when insufficient_privilege then denied:=true;end;assert denied,'self approval allowed';
 denied:=false;begin perform public.admin_notifications_feed();exception when insufficient_privilege then denied:=true;end;assert denied,'member read admin inbox';
 denied:=false;begin perform public.claim_admin_push_batch(null);exception when insufficient_privilege then denied:=true;end;assert denied,'browser claimed push jobs';
 denied:=false;begin perform public.admin_save_push_subscription('{}','fake');exception when insufficient_privilege then denied:=true;end;assert denied,'member registered admin push';
end;$$;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin assert jsonb_array_length(public.my_access_requests())=0,'member read another request';end;$$;
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
do $$declare denied boolean:=false;begin
 perform public.admin_resolve_access_request('88888888-8888-4888-8888-888888888888','approved','verified offline');
 perform public.admin_resolve_access_request('88888888-8888-4888-8888-888888888888','approved','retry');
 assert (select count(*) from public.patient_records)=0,'admin store exposed all clinical data';
 begin perform public.admin_save_push_subscription(jsonb_build_object('endpoint','https://127.0.0.1/private','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('A',22))),'unsafe');exception when invalid_parameter_value then denied:=true;end;assert denied,'unsafe push endpoint accepted';
 perform public.admin_save_push_subscription(jsonb_build_object('endpoint','https://web.push.apple.com/synthetic-subscription','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('A',22))),'Synthetic iPhone');
 assert public.admin_has_push_subscription('https://web.push.apple.com/synthetic-subscription');
 denied:=false;begin perform public.admin_set_access('77777777-7777-4777-8777-777777777777',true,1,3,'stale','therapist','1970-01-01'::timestamptz);exception when serialization_failure then denied:=true;end;assert denied,'stale admin form overwrote grants';
end;$$;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$declare a jsonb;begin
 a:=public.my_access();assert a->>'member_type'='therapist';assert (a->>'approved')::boolean;
 perform public.submit_access_request('99999999-9999-4999-8999-999999999999','visits',2,'two more visits');
 perform public.submit_access_request('abababab-abab-4bab-8bab-abababababab','patients',1,'one more patient');
end;$$;
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
do $$declare denied boolean:=false;begin
 perform public.admin_resolve_access_request('99999999-9999-4999-8999-999999999999','approved','two credits granted');
 perform public.admin_resolve_access_request('99999999-9999-4999-8999-999999999999','approved','retry');
 begin perform public.admin_resolve_access_request('abababab-abab-4bab-8bab-abababababab','rejected','');exception when invalid_parameter_value then denied:=true;end;assert denied,'rejection without reason allowed';
 perform public.admin_resolve_access_request('abababab-abab-4bab-8bab-abababababab','rejected','not approved');
end;$$;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$declare a jsonb;begin a:=public.my_access();assert (a->>'visit_limit')::int=5,'credits not granted exactly once';assert (a->>'patient_limit')::int=1,'rejection changed quota';assert jsonb_array_length(public.my_access_requests())=3;end;$$;
set role service_role;
do $$declare jobs jsonb;job jsonb;begin
 jobs:=public.claim_admin_push_batch(null);assert jsonb_array_length(jobs)>=2,'new requests not queued';
 assert jsonb_array_length(public.claim_admin_push_batch(null))=0,'leased jobs were claimed twice';
 for job in select * from jsonb_array_elements(jobs) loop
  perform public.complete_admin_push_delivery((job->>'id')::uuid,(job->>'claim_id')::uuid,'sent',201);
  perform public.complete_admin_push_delivery((job->>'id')::uuid,(job->>'claim_id')::uuid,'sent',201);
 end loop;
 assert jsonb_array_length(public.claim_admin_push_batch(null))=0,'sent jobs were replayed';
end;$$;
reset role;
do $$begin assert (select count(*) from public.access_audit where therapist_id='77777777-7777-4777-8777-777777777777')=2,'request retry duplicated grant audit';assert (select count(*) from public.admin_notifications where source_id='88888888-8888-4888-8888-888888888888')=1;end;$$;
set role anon;
do $$declare denied boolean:=false;begin begin perform public.my_access_requests();exception when insufficient_privilege then denied:=true;end;assert denied,'anonymous member requests allowed';end;$$;
reset role;
select 'PASS: categories, temporary-only member gate, request isolation/idempotency, verification/credits, push authorization and durable claims' as result;
-- Transient errors defer retry; expired subscriptions are disabled; crashed leases recover safely.
set role authenticated;
set request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
select public.submit_access_request('cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd','visits',1,'retry transport fixture');
set role service_role;
do $$declare jobs jsonb;j jsonb;begin
 jobs:=public.claim_admin_push_batch(null);assert jsonb_array_length(jobs)=1;j:=jobs->0;
 perform public.complete_admin_push_delivery((j->>'id')::uuid,(j->>'claim_id')::uuid,'retry',503);
 assert jsonb_array_length(public.claim_admin_push_batch(null))=0,'transient failure ignored backoff';
end;$$;
reset role;
update public.admin_push_deliveries set next_attempt_at=now()-interval '1 minute' where status='pending';
set role service_role;
do $$declare jobs jsonb;j jsonb;begin jobs:=public.claim_admin_push_batch(null);assert jsonb_array_length(jobs)=1;j:=jobs->0;perform public.complete_admin_push_delivery((j->>'id')::uuid,(j->>'claim_id')::uuid,'expired',410);end;$$;
reset role;
do $$begin assert not (select active from public.admin_push_subscriptions where endpoint='https://web.push.apple.com/synthetic-subscription');end;$$;
set role authenticated;
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
select public.admin_save_push_subscription(jsonb_build_object('endpoint','https://web.push.apple.com/synthetic-subscription','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('A',22))),'Synthetic iPhone');
reset role;
insert into auth.users(id,email) values('dededede-dede-4ede-8ede-dededededede','lease-fixture@example.test');
set role service_role;
do $$begin perform public.claim_admin_push_batch(null);end;$$;
reset role;
update public.admin_push_deliveries set lease_until=now()-interval '1 minute' where status='sending';
set role service_role;
do $$declare jobs jsonb;j jsonb;begin jobs:=public.claim_admin_push_batch(null);assert jsonb_array_length(jobs)=1;j:=jobs->0;perform public.complete_admin_push_delivery((j->>'id')::uuid,(j->>'claim_id')::uuid,'sent',201);end;$$;
reset role;
select 'PASS: deferred retries, subscription expiry and crashed delivery lease recovery' as result;
