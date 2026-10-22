-- Run in the Supabase SQL Editor. No service-role key is used in the browser.
begin;
create table if not exists public.patient_records (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document jsonb not null,
  revision bigint not null default 1 check(revision > 0),
  last_change_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint valid_document check (
    coalesce(jsonb_typeof(document) = 'object'
    and document->>'schemaVersion' = '1'
    and jsonb_typeof(document->'identity') = 'object'
    and jsonb_typeof(document->'visits') = 'array'
    and document->>'id' = id::text
    and octet_length(document::text) < 4000000,false)
  )
);
create index if not exists patient_records_owner_idx on public.patient_records(owner_id, updated_at desc);
alter table public.patient_records enable row level security;
alter table public.patient_records force row level security;
drop policy if exists own_records_select on public.patient_records;
create policy own_records_select on public.patient_records for select to authenticated using(owner_id=auth.uid());
drop policy if exists own_records_insert on public.patient_records;
create policy own_records_insert on public.patient_records for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists own_records_update on public.patient_records;
create policy own_records_update on public.patient_records for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
-- Direct writes are revoked: every write goes through the revision-checked RPC.
revoke all on public.patient_records from anon, authenticated;
grant select on public.patient_records to authenticated;

create or replace function public.save_patient_record(p_id uuid,p_document jsonb,p_expected_revision bigint,p_change_id uuid)
returns setof public.patient_records
language plpgsql security definer set search_path = '' as $$
declare old public.patient_records; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_expected_revision is null or p_expected_revision < 0 or p_change_id is null or p_id is null then
  raise exception 'Invalid revision or change id' using errcode='22023';
 end if;
 -- An explicit owner check is required because SECURITY DEFINER bypasses RLS.
 select * into old from public.patient_records where id=p_id for update;
 if found then
  if old.owner_id <> uid then raise exception 'Record access denied' using errcode='42501'; end if;
  if old.last_change_id = p_change_id then
   return query select * from public.patient_records where id=p_id and owner_id=uid; return;
  end if;
  if old.revision <> p_expected_revision then raise exception 'Record changed on another device' using errcode='40001'; end if;
  return query update public.patient_records set document=p_document,revision=revision+1,last_change_id=p_change_id,updated_at=now()
   where id=p_id and owner_id=uid returning *;
 else
  if p_expected_revision <> 0 then raise exception 'Record revision not found' using errcode='40001'; end if;
  begin
   return query insert into public.patient_records(id,owner_id,document,revision,last_change_id)
    values(p_id,uid,p_document,1,p_change_id) returning *;
  exception when unique_violation then
   raise exception 'Record created on another device' using errcode='40001';
  end;
 end if;
end; $$;
revoke all on function public.save_patient_record(uuid,jsonb,bigint,uuid) from public, anon;
grant execute on function public.save_patient_record(uuid,jsonb,bigint,uuid) to authenticated;
commit;
