-- Apply once in the production Supabase SQL Editor.
begin;

create or replace function public.admin_member_login_status(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.platform_admins where user_id=auth.uid()) then
  raise exception 'Admin access required' using errcode='42501';
 end if;
 return (
  select jsonb_build_object(
   'emailConfirmedAt', u.email_confirmed_at,
   'lastSignIn', u.last_sign_in_at,
   'suspended', coalesce(u.banned_until > now(), false),
   'retired', u.deleted_at is not null
  )
  from auth.users u where u.id=p_user_id
 );
end;$$;

revoke all on function public.admin_member_login_status(uuid) from public,anon;
grant execute on function public.admin_member_login_status(uuid) to authenticated;

commit;
