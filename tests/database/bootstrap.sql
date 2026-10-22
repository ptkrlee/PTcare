create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','therapist@example.test'),('22222222-2222-4222-8222-222222222222','other@example.test'),('33333333-3333-4333-8333-333333333333','admin@example.test');
