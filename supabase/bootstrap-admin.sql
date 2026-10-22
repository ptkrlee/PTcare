-- Run ONCE as the project owner in Supabase SQL Editor, after schema.sql.
-- Replace the email below with the email used to sign up for this website.
-- This grants admin rights only; no password or secret key belongs in this file.
begin;
do $$
declare admin_email text := 'REPLACE_WITH_YOUR_SIGNUP_EMAIL'; admin_id uuid;
begin
 select id into admin_id from auth.users where lower(email)=lower(admin_email);
 if admin_id is null then raise exception '해당 이메일로 먼저 웹사이트에 가입한 뒤 이메일을 정확히 입력하세요.';end if;
 insert into public.platform_admins(user_id) values(admin_id) on conflict do nothing;
 update public.therapist_access set approved=true where user_id=admin_id;
end;$$;
commit;
