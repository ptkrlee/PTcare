\set ON_ERROR_STOP on
-- Simulate a pre-upgrade server, including custom grants and suspended quotas.
alter table public.therapist_access alter column visit_limit set default 3;
update public.therapist_access set visit_limit=3 where user_id='11111111-1111-4111-8111-111111111111';
update public.therapist_access set visit_limit=5 where user_id='22222222-2222-4222-8222-222222222222';
update public.therapist_access set visit_limit=12 where user_id='33333333-3333-4333-8333-333333333333';
update public.therapist_access set visit_limit=0 where user_id='44444444-4444-4444-8444-444444444444';
create temporary table quota_preservation as select user_id,approved,member_type,patient_limit from public.therapist_access;
create temporary table record_preservation as select id,document,revision from public.patient_records;
\i /tmp/ptcare-upgrade-eight-visits.sql
do $$begin
 assert (select visit_limit from public.therapist_access where user_id='11111111-1111-4111-8111-111111111111')=8;
 assert (select visit_limit from public.therapist_access where user_id='22222222-2222-4222-8222-222222222222')=8;
 assert (select visit_limit from public.therapist_access where user_id='33333333-3333-4333-8333-333333333333')=12;
 assert (select visit_limit from public.therapist_access where user_id='44444444-4444-4444-8444-444444444444')=0;
 assert not exists(select user_id,approved,member_type,patient_limit from public.therapist_access except select * from quota_preservation),'approval or patient allowance changed';
 assert not exists(select * from record_preservation except select id,document,revision from public.patient_records),'clinical records changed';
end;$$;
-- A later admin reduction remains intact on repeated migration.
update public.therapist_access set visit_limit=2 where user_id='11111111-1111-4111-8111-111111111111';
\i /tmp/ptcare-upgrade-eight-visits.sql
insert into auth.users(id,email,raw_user_meta_data) values('acacacac-acac-4aca-8aca-acacacacacac','eight-visits@example.test','{"member_type":"therapist"}');
do $$begin
 assert (select visit_limit from public.therapist_access where user_id='11111111-1111-4111-8111-111111111111')=2,'rerun overwrote later admin grant';
 assert (select visit_limit from public.therapist_access where user_id='acacacac-acac-4aca-8aca-acacacacacac')=8,'new account not eight visits';
 assert not (select approved from public.therapist_access where user_id='acacacac-acac-4aca-8aca-acacacacacac'),'migration self-approved signup';
end;$$;
select 'PASS: legacy quotas upgrade to eight, new signups use eight, suspended/higher/custom grants and clinical records are preserved' as result;
