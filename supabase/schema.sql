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

-- Account limits are enforced inside the same transaction as clinical record writes.
create table if not exists public.therapist_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 approved boolean not null default false,
 patient_limit integer not null default 1 check(patient_limit between 0 and 100000),
 visit_limit integer not null default 3 check(visit_limit between 0 and 100000),
 updated_at timestamptz not null default now()
);
create table if not exists public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.access_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 therapist_id uuid not null references auth.users(id),
 before_access jsonb not null, after_access jsonb not null,
 reason text not null check(length(trim(reason)) between 1 and 1000),
 created_at timestamptz not null default now()
);
alter table public.therapist_access enable row level security;
alter table public.platform_admins enable row level security;
alter table public.access_audit enable row level security;
revoke all on public.therapist_access,public.platform_admins,public.access_audit from public,anon,authenticated;
-- Auth metadata cannot grant admin privileges or change quotas.
create or replace function public.initialize_therapist_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin insert into public.therapist_access(user_id) values(new.id) on conflict do nothing;return new;end;$$;
revoke all on function public.initialize_therapist_access() from public,anon,authenticated;
drop trigger if exists initialize_therapist_access on auth.users;
create trigger initialize_therapist_access after insert on auth.users for each row execute function public.initialize_therapist_access();
insert into public.therapist_access(user_id) select id from auth.users on conflict do nothing;
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('approved',a.approved,'patient_limit',a.patient_limit,'visit_limit',a.visit_limit,
 'is_admin',exists(select 1 from public.platform_admins where user_id=auth.uid()),
 'patient_count',(select count(*) from public.patient_records where owner_id=auth.uid()))
 from public.therapist_access a where a.user_id=auth.uid();
$$;
create or replace function public.admin_therapists() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(row_to_json(t) order by t.email) from (
 select a.*,u.email,(select count(*) from public.patient_records p where p.owner_id=a.user_id) as patient_count,
 (select coalesce(sum(jsonb_array_length(p.document->'visits')),0) from public.patient_records p where p.owner_id=a.user_id) as visit_count
 from public.therapist_access a join auth.users u on u.id=a.user_id) t),'[]'::jsonb);
end;$$;
create or replace function public.admin_set_access(p_user_id uuid,p_approved boolean,p_patient_limit integer,p_visit_limit integer,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare prior public.therapist_access; updated public.therapist_access;
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 if p_approved is null or p_patient_limit is null or p_visit_limit is null or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception '승인 상태, 한도, 변경 사유를 입력해 주세요.' using errcode='22023';end if;
 select * into prior from public.therapist_access where user_id=p_user_id for update;
 if not found then raise exception 'Therapist not found' using errcode='22023';end if;
 update public.therapist_access set approved=p_approved,patient_limit=p_patient_limit,visit_limit=p_visit_limit,updated_at=now() where user_id=p_user_id returning * into updated;
 insert into public.access_audit(actor_id,therapist_id,before_access,after_access,reason) values(auth.uid(),p_user_id,to_jsonb(prior),to_jsonb(updated),trim(p_reason));
end;$$;
create or replace function public.admin_patient_records(p_owner_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc) from public.patient_records p where owner_id=p_owner_id),'[]'::jsonb);
end;$$;
create or replace function public.admin_access_history(p_owner_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (select * from public.access_audit where therapist_id=p_owner_id order by created_at desc limit 100) t),'[]'::jsonb);
end;$$;
revoke all on function public.my_access(),public.admin_therapists(),public.admin_set_access(uuid,boolean,integer,integer,text),public.admin_patient_records(uuid),public.admin_access_history(uuid) from public,anon;
grant execute on function public.my_access(),public.admin_therapists(),public.admin_set_access(uuid,boolean,integer,integer,text),public.admin_patient_records(uuid),public.admin_access_history(uuid) to authenticated;

-- Internal validation: visit IDs cannot be removed/replaced to reuse a consumed slot.
create or replace function public.validate_visit_quota(proposed jsonb,prior jsonb,visit_cap integer) returns void
language plpgsql set search_path='' as $$
declare ids text[]; previous text[];
begin
 if jsonb_typeof(proposed->'visits') is distinct from 'array' then raise exception 'Invalid visits' using errcode='23514';end if;
 select coalesce(array_agg(v->>'id'),'{}') into ids from jsonb_array_elements(proposed->'visits') v;
 if exists(select 1 from unnest(ids) id where id is null or id!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') or cardinality(ids)<>(select count(distinct id) from unnest(ids) id) then raise exception 'Invalid or duplicate visit IDs' using errcode='23514';end if;
 select coalesce(array_agg(v->>'id'),'{}') into previous from jsonb_array_elements(coalesce(prior->'visits','[]')) v;
 if not previous <@ ids then raise exception '기존 회차는 삭제하거나 다른 회차로 대체할 수 없습니다.' using errcode='P0001';end if;
 if not ids <@ previous and cardinality(ids)>visit_cap then raise exception '이 대상자의 회차 한도에 도달했습니다. 기존 회차를 이어서 작성하거나 관리자에게 추가 이용권을 요청해 주세요.' using errcode='P0001';end if;
end;$$;
revoke all on function public.validate_visit_quota(jsonb,jsonb,integer) from public,anon,authenticated;

create or replace function public.save_patient_record(p_id uuid,p_document jsonb,p_expected_revision bigint,p_change_id uuid)
returns setof public.patient_records
language plpgsql security definer set search_path = '' as $$
declare old public.patient_records; uid uuid := auth.uid(); access public.therapist_access;
begin
 if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_expected_revision is null or p_expected_revision < 0 or p_change_id is null or p_id is null then
  raise exception 'Invalid revision or change id' using errcode='22023';
 end if;
 -- Serialize all new allocations for this account, including simultaneous devices.
 select * into access from public.therapist_access where user_id=uid for update;
 if not found or not access.approved then raise exception '관리자의 치료사 승인이 필요합니다. 입력한 기기 기록은 보존됩니다.' using errcode='P0001';end if;
 -- An explicit owner check is required because SECURITY DEFINER bypasses RLS.
 select * into old from public.patient_records where id=p_id for update;
 if found then
  if old.owner_id <> uid then raise exception 'Record access denied' using errcode='42501'; end if;
  if old.last_change_id = p_change_id then
   return query select * from public.patient_records where id=p_id and owner_id=uid; return;
  end if;
  if old.revision <> p_expected_revision then raise exception 'Record changed on another device' using errcode='40001'; end if;
  -- Existing records remain editable after a limit is reduced.
  perform public.validate_visit_quota(p_document,old.document,access.visit_limit);
  return query update public.patient_records set document=p_document,revision=revision+1,last_change_id=p_change_id,updated_at=now()
   where id=p_id and owner_id=uid returning *;
 else
  if p_expected_revision <> 0 then raise exception 'Record revision not found' using errcode='40001'; end if;
  if (select count(*) from public.patient_records where owner_id=uid)>=access.patient_limit then raise exception '대상자 저장 한도에 도달했습니다. 관리자에게 추가 이용권을 요청해 주세요.' using errcode='P0001';end if;
  perform public.validate_visit_quota(p_document,null,access.visit_limit);
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
