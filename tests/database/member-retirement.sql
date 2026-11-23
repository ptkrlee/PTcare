begin;
-- Simulate the Auth service marking a member as soft-deleted in place.
update auth.users set deleted_at=now() where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$begin
 assert not public.member_session_active(), 'retired session still marked active';
 assert public.my_access() is null, 'retired session can load membership';
 assert (select count(*) from public.patient_records)=0, 'retired session can read clinical records';
 begin
  perform public.save_patient_record('55555555-5555-4555-8555-555555555555','{}',1,gen_random_uuid());
  raise exception 'retired session can save clinical records';
 exception when invalid_authorization_specification then null;
 end;
end;$$;
set local request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
do $$begin
 assert jsonb_array_length(public.admin_patient_records('22222222-2222-4222-8222-222222222222'))>0, 'retirement removed clinical records';
end;$$;
rollback;
select 'PASS: retirement blocks stale tokens and preserves administrator access to records' as result;
