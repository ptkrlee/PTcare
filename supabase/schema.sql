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
 visit_limit integer not null default 8 check(visit_limit between 0 and 100000),
 updated_at timestamptz not null default now()
);
do $quota$
begin
 lock table public.therapist_access in access exclusive mode;
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
-- New accounts choose a membership category; approval is always controlled by admins.
-- The legacy default is used only to retain existing therapists on first migration.
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='therapist_access' and column_name='member_type') then
  alter table public.therapist_access add column member_type text not null default 'therapist' check(member_type in ('general','therapist'));
  -- Honor an explicit general-member signup made just before this migration, without demoting legacy clinical users.
  update public.therapist_access a set member_type='general' where not a.approved
   and exists(select 1 from auth.users u where u.id=a.user_id and u.raw_user_meta_data->>'member_type'='general')
   and not exists(select 1 from public.patient_records p where p.owner_id=a.user_id);
 end if;
end;$$;
alter table public.therapist_access alter column member_type set default 'general';
create table if not exists public.access_requests (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('verification','patients','visits')),
 amount integer not null check((kind='verification' and amount=0) or (kind<>'verification' and amount between 1 and 1000)),
 message text not null check(length(trim(message)) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 processed_at timestamptz, processed_by uuid references auth.users(id), admin_note text not null default ''
);
create unique index if not exists access_requests_pending_idx on public.access_requests(owner_id,kind) where status='pending';
create table if not exists public.admin_notifications (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('signup','request')),
 actor_id uuid not null references auth.users(id) on delete cascade,
 source_id uuid not null,
 created_at timestamptz not null default now(),
 unique(kind,source_id)
);
create table if not exists public.admin_notification_reads (
 notification_id uuid not null references public.admin_notifications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(), primary key(notification_id,user_id)
);
create table if not exists public.admin_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 device_label text not null default '', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.admin_notifications(id) on delete cascade,
 subscription_id uuid not null references public.admin_push_subscriptions(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','sending','sent','dead')),
 attempts integer not null default 0,
 claim_id uuid, lease_until timestamptz, next_attempt_at timestamptz not null default now(),
 http_status integer, sent_at timestamptz,
 unique(notification_id,subscription_id)
);
create index if not exists admin_push_pending_idx on public.admin_push_deliveries(status,next_attempt_at);
alter table public.access_requests enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;
alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_deliveries enable row level security;
revoke all on public.access_requests,public.admin_notifications,public.admin_notification_reads,public.admin_push_subscriptions,public.admin_push_deliveries from public,anon,authenticated;

-- Auth metadata cannot grant admin privileges or change quotas.
create or replace function public.initialize_therapist_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.therapist_access(user_id,member_type) values(new.id,case when new.raw_user_meta_data->>'member_type'='therapist' then 'therapist' else 'general' end) on conflict do nothing;
 insert into public.admin_notifications(kind,actor_id,source_id) values('signup',new.id,new.id) on conflict do nothing;
 return new;
end;$$;
revoke all on function public.initialize_therapist_access() from public,anon,authenticated;
drop trigger if exists initialize_therapist_access on auth.users;
create trigger initialize_therapist_access after insert on auth.users for each row execute function public.initialize_therapist_access();
insert into public.therapist_access(user_id,member_type) select id,case when raw_user_meta_data->>'member_type'='general' then 'general' else 'therapist' end from auth.users on conflict do nothing;
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('member_type',a.member_type,'approved',a.approved,'patient_limit',a.patient_limit,'visit_limit',a.visit_limit,
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
drop function if exists public.admin_set_access(uuid,boolean,integer,integer,text);
drop function if exists public.admin_set_access(uuid,boolean,integer,integer,text,text);
create or replace function public.admin_set_access(p_user_id uuid,p_approved boolean,p_patient_limit integer,p_visit_limit integer,p_reason text,p_member_type text default null,p_expected_updated_at timestamptz default null) returns void
language plpgsql security definer set search_path='' as $$
declare prior public.therapist_access; updated public.therapist_access;
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 if p_member_type is not null and p_member_type not in ('general','therapist') then raise exception 'Invalid membership type' using errcode='22023';end if;
 if p_approved is null or p_patient_limit is null or p_visit_limit is null or p_reason is null or length(trim(p_reason)) not between 1 and 1000 then raise exception '승인 상태, 한도, 변경 사유를 입력해 주세요.' using errcode='22023';end if;
 select * into prior from public.therapist_access where user_id=p_user_id for update;
 if not found then raise exception 'Therapist not found' using errcode='22023';end if;
 if coalesce(p_member_type,prior.member_type)='general' and p_approved then raise exception '치료사회원으로 구분한 뒤 인증을 승인해 주세요.' using errcode='22023';end if;
 if p_expected_updated_at is not null and prior.updated_at<>p_expected_updated_at then raise exception '회원 설정이 다른 작업에서 변경되었습니다. 새로고침 후 다시 확인해 주세요.' using errcode='40001';end if;
 update public.therapist_access set member_type=coalesce(p_member_type,member_type),approved=p_approved,patient_limit=p_patient_limit,visit_limit=p_visit_limit,updated_at=now() where user_id=p_user_id returning * into updated;
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
revoke all on function public.my_access(),public.admin_therapists(),public.admin_set_access(uuid,boolean,integer,integer,text,text,timestamptz),public.admin_patient_records(uuid),public.admin_access_history(uuid) from public,anon;
grant execute on function public.my_access(),public.admin_therapists(),public.admin_set_access(uuid,boolean,integer,integer,text,text,timestamptz),public.admin_patient_records(uuid),public.admin_access_history(uuid) to authenticated;

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
 if not found or access.member_type<>'therapist' or not access.approved then raise exception '관리자의 치료사 승인이 필요합니다. 입력한 기기 기록은 보존됩니다.' using errcode='P0001';end if;
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
-- Members can read their own requests, but cannot grant themselves credits or verification.
create or replace function public.my_access_requests() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
 from (select * from public.access_requests where owner_id=auth.uid() order by created_at desc limit 100) r;
$$;
create or replace function public.submit_access_request(p_id uuid,p_kind text,p_amount integer,p_message text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare account public.therapist_access; prior public.access_requests; saved public.access_requests;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000';end if;
 select * into account from public.therapist_access where user_id=auth.uid() for update;
 if not found then raise exception 'Membership not found' using errcode='42501';end if;
 if p_id is null or p_kind is null or p_kind not in ('verification','patients','visits') or p_amount is null or p_message is null or length(trim(p_message)) not between 1 and 1000 then raise exception '요청 내용과 종류를 확인해 주세요.' using errcode='22023';end if;
 select * into prior from public.access_requests where id=p_id;
 if found then
  if prior.owner_id<>auth.uid() then raise exception 'Request access denied' using errcode='42501';end if;
  if prior.kind<>p_kind or prior.amount<>p_amount or prior.message<>trim(p_message) then raise exception 'Request ID was already used for different content' using errcode='22023';end if;
  return to_jsonb(prior);
 end if;
 if p_kind='verification' and account.member_type='therapist' and account.approved then raise exception '이미 인증된 치료사회원입니다.' using errcode='P0001';end if;
 if exists(select 1 from public.access_requests where owner_id=auth.uid() and kind=p_kind and status='pending') then raise exception '같은 종류의 요청이 검토 중입니다. 처리 결과를 기다려 주세요.' using errcode='P0001';end if;
 if (select count(*) from public.access_requests where owner_id=auth.uid() and created_at>now()-interval '24 hours')>=10 then raise exception '하루 요청 한도에 도달했습니다. 나중에 다시 요청해 주세요.' using errcode='P0001';end if;
 insert into public.access_requests(id,owner_id,kind,amount,message) values(p_id,auth.uid(),p_kind,p_amount,trim(p_message)) returning * into saved;
 insert into public.admin_notifications(kind,actor_id,source_id) values('request',auth.uid(),saved.id);
 return to_jsonb(saved);
end;$$;
create or replace function public.admin_access_requests() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
 select r.*,u.email,a.member_type,a.approved as therapist_approved from public.access_requests r join auth.users u on u.id=r.owner_id join public.therapist_access a on a.user_id=r.owner_id order by r.created_at desc limit 200) r),'[]'::jsonb);
end;$$;
create or replace function public.admin_resolve_access_request(p_id uuid,p_decision text,p_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare request public.access_requests; prior public.therapist_access; updated public.therapist_access;
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 if p_decision is null or p_decision not in ('approved','rejected') or p_note is null or length(p_note)>500 or (p_decision='rejected' and length(trim(p_note))=0) then raise exception '처리 결과와 사유를 확인해 주세요.' using errcode='22023';end if;
 select * into request from public.access_requests where id=p_id;
 if not found then raise exception 'Request not found' using errcode='22023';end if;
 -- Same account-first lock order as clinical writes and member requests.
 select * into prior from public.therapist_access where user_id=request.owner_id for update;
 select * into request from public.access_requests where id=p_id for update;
 if request.status<>'pending' then return to_jsonb(request);end if;
 if p_decision='approved' then
  update public.therapist_access set member_type=case when request.kind='verification' then 'therapist' else member_type end,
   approved=case when request.kind='verification' then true else approved end,
   patient_limit=patient_limit+case when request.kind='patients' then request.amount else 0 end,
   visit_limit=visit_limit+case when request.kind='visits' then request.amount else 0 end, updated_at=now()
   where user_id=request.owner_id returning * into updated;
  insert into public.access_audit(actor_id,therapist_id,before_access,after_access,reason) values(auth.uid(),request.owner_id,to_jsonb(prior),to_jsonb(updated),'요청 승인 ('||request.kind||', '||request.amount||'): '||trim(p_note));
 end if;
 update public.access_requests set status=p_decision,processed_at=now(),processed_by=auth.uid(),admin_note=trim(p_note) where id=p_id returning * into request;
 insert into public.admin_notification_reads(notification_id,user_id) select id,auth.uid() from public.admin_notifications where kind='request' and source_id=request.id on conflict do nothing;
 return to_jsonb(request);
end;$$;
create or replace function public.admin_notifications_feed() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (
 select n.*,u.email,a.member_type,r.kind as request_kind,r.status as request_status,reads.read_at
 from public.admin_notifications n join auth.users u on u.id=n.actor_id join public.therapist_access a on a.user_id=n.actor_id
 left join public.access_requests r on n.kind='request' and r.id=n.source_id
 left join public.admin_notification_reads reads on reads.notification_id=n.id and reads.user_id=auth.uid()
 order by n.created_at desc limit 100) n),'[]'::jsonb);
end;$$;
create or replace function public.admin_mark_notification_read(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 insert into public.admin_notification_reads(notification_id,user_id) select id,auth.uid() from public.admin_notifications where id=p_id on conflict do nothing;
end;$$;
revoke all on function public.my_access_requests(),public.submit_access_request(uuid,text,integer,text),public.admin_access_requests(),public.admin_resolve_access_request(uuid,text,text),public.admin_notifications_feed(),public.admin_mark_notification_read(uuid) from public,anon;
grant execute on function public.my_access_requests(),public.submit_access_request(uuid,text,integer,text),public.admin_access_requests(),public.admin_resolve_access_request(uuid,text,text),public.admin_notifications_feed(),public.admin_mark_notification_read(uuid) to authenticated;

create or replace function public.admin_save_push_subscription(p_subscription jsonb,p_device_label text) returns void
language plpgsql security definer set search_path='' as $$
declare endpoint_value text:=p_subscription->>'endpoint'; existing_owner uuid;
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 if endpoint_value is null or length(endpoint_value)>3000 or endpoint_value!~'^https://(fcm[.]googleapis[.]com|([a-z0-9-]+[.])*push[.]services[.]mozilla[.]com|([a-z0-9-]+[.])*push[.]apple[.]com|([a-z0-9-]+[.])*notify[.]windows[.]com)/' or octet_length(p_subscription::text)>5000
  or coalesce(p_subscription->'keys'->>'p256dh','')!~'^[A-Za-z0-9_-]{87}=?$' or coalesce(p_subscription->'keys'->>'auth','')!~'^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'Invalid push subscription' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(endpoint_value,0));
 select user_id into existing_owner from public.admin_push_subscriptions where endpoint=endpoint_value for update;
 if found and existing_owner<>auth.uid() then raise exception '이 기기의 알림을 먼저 해제하고 다시 등록해 주세요.' using errcode='42501';end if;
 insert into public.admin_push_subscriptions(user_id,endpoint,subscription,device_label) values(auth.uid(),endpoint_value,p_subscription,left(coalesce(p_device_label,''),80))
 on conflict(endpoint) do update set subscription=excluded.subscription,device_label=excluded.device_label,active=true,updated_at=now() where public.admin_push_subscriptions.user_id=auth.uid();
end;$$;
create or replace function public.admin_remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 update public.admin_push_subscriptions set active=false,updated_at=now() where endpoint=p_endpoint and user_id=auth.uid();
end;$$;
create or replace function public.admin_has_push_subscription(p_endpoint text) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then raise exception 'Admin access required' using errcode='42501';end if;
 return exists(select 1 from public.admin_push_subscriptions where endpoint=p_endpoint and user_id=auth.uid() and active);
end;$$;
-- Browser clients cannot claim/complete deliveries. Only the server service role can.
create or replace function public.claim_admin_push_batch(p_notification_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare output jsonb;
begin
 update public.admin_push_deliveries set status='dead',lease_until=null where status='sending' and lease_until<now() and attempts>=6;
 insert into public.admin_push_deliveries(notification_id,subscription_id)
 select n.id,s.id from public.admin_notifications n cross join public.admin_push_subscriptions s join public.platform_admins a on a.user_id=s.user_id
 where s.active and n.created_at>=s.created_at and n.created_at>now()-interval '24 hours' and (p_notification_id is null or n.id=p_notification_id)
 on conflict do nothing;
 with candidates as (
  select d.id from public.admin_push_deliveries d join public.admin_push_subscriptions s on s.id=d.subscription_id join public.platform_admins a on a.user_id=s.user_id
  where s.active and d.attempts<6 and (p_notification_id is null or d.notification_id=p_notification_id)
   and ((d.status='pending' and d.next_attempt_at<=now()) or (d.status='sending' and d.lease_until<now()))
  order by d.next_attempt_at,d.id limit 20 for update of d skip locked
 ), claimed as (
  update public.admin_push_deliveries d set status='sending',attempts=attempts+1,claim_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'claim_id',d.claim_id,'notification_id',d.notification_id,'kind',n.kind,'subscription',s.subscription)),'[]'::jsonb) into output
 from claimed d join public.admin_notifications n on n.id=d.notification_id join public.admin_push_subscriptions s on s.id=d.subscription_id;
 return output;
end;$$;
create or replace function public.complete_admin_push_delivery(p_id uuid,p_claim_id uuid,p_result text,p_http_status integer) returns void
language plpgsql security definer set search_path='' as $$
declare d public.admin_push_deliveries;
begin
 if p_result is null or p_result not in ('sent','expired','retry') then raise exception 'Invalid delivery result' using errcode='22023';end if;
 select * into d from public.admin_push_deliveries where id=p_id and claim_id=p_claim_id and status='sending' for update;
 if not found then return;end if;
 update public.admin_push_deliveries set status=case when p_result='sent' then 'sent' when p_result='expired' or attempts>=6 then 'dead' else 'pending' end,
  sent_at=case when p_result='sent' then now() else null end,http_status=p_http_status,lease_until=null,
  next_attempt_at=now()+make_interval(secs=>least(21600,30*power(2,attempts)::integer)) where id=d.id;
 if p_result='expired' then update public.admin_push_subscriptions set active=false,updated_at=now() where id=d.subscription_id;end if;
end;$$;
revoke all on function public.admin_save_push_subscription(jsonb,text),public.admin_remove_push_subscription(text),public.admin_has_push_subscription(text) from public,anon;
grant execute on function public.admin_save_push_subscription(jsonb,text),public.admin_remove_push_subscription(text),public.admin_has_push_subscription(text) to authenticated;
revoke all on function public.claim_admin_push_batch(uuid),public.complete_admin_push_delivery(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.claim_admin_push_batch(uuid),public.complete_admin_push_delivery(uuid,uuid,text,integer) to service_role;
-- Server health/auth checks have no access to clinical records through this grant.
grant select on public.platform_admins to service_role;

commit;
