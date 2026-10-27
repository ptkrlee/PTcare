-- Run in Supabase SQL Editor once. Existing records and approvals are preserved.
-- Upgrade positive limits below 8, preserve 0 (blocked) and higher admin grants.
-- The default acts as a migration marker so reruns retain later admin adjustments.
begin;
lock table public.therapist_access in access exclusive mode;
do $quota$
begin
 if (select column_default from information_schema.columns
     where table_schema='public' and table_name='therapist_access'
       and column_name='visit_limit') <> '8' then
  alter table public.therapist_access alter column visit_limit set default 8;
  update public.therapist_access
     set visit_limit=8, updated_at=now()
   where visit_limit between 1 and 7;
 end if;
end;
$quota$;
commit;
