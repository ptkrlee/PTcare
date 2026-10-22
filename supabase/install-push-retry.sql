-- Optional but recommended: retry durable pushes every minute, even while no browser is open.
-- First set Vercel server env vars and the Database Webhook described in docs/MOBILE-NOTIFICATIONS.md.
-- Paste the SAME PUSH_WEBHOOK_SECRET below privately in SQL Editor. Never commit the filled version.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;
do $$
declare dispatch_url text:='https://refittherapy.vercel.app/api/admin-push'; shared_secret text:='REPLACE_WITH_PUSH_WEBHOOK_SECRET'; secret_id uuid;
begin
 if shared_secret='REPLACE_WITH_PUSH_WEBHOOK_SECRET' or length(shared_secret)<32 then raise exception 'Vercel의 PUSH_WEBHOOK_SECRET 값을 먼저 입력해 주세요.';end if;
 select id into secret_id from vault.secrets where name='ptcare_push_dispatch_url';
 if secret_id is null then perform vault.create_secret(dispatch_url,'ptcare_push_dispatch_url');else perform vault.update_secret(secret_id,dispatch_url);end if;
 select id into secret_id from vault.secrets where name='ptcare_push_webhook_secret';
 if secret_id is null then perform vault.create_secret(shared_secret,'ptcare_push_webhook_secret');else perform vault.update_secret(secret_id,shared_secret);end if;
end;$$;
select cron.schedule('ptcare-admin-push-retry','* * * * *', $job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='ptcare_push_dispatch_url'),
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ptcare_push_webhook_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 );
$job$);
commit;
