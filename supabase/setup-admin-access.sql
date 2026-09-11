-- Run in the SQL Editor of the Supabase project connected to this website.
-- This installs the login permission check only; admin.sql installs operational features.
begin;
create table if not exists public.admin_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('super_admin','order_manager','product_manager','inventory_manager','delivery_manager','support_staff')),
 permissions jsonb not null default '{}',
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.admin_staff enable row level security;
create or replace function public.admin_can(section text, action text default 'view')
returns boolean language sql stable security definer set search_path=public as $$
 select exists (
   select 1 from public.admin_staff s
   where s.user_id=auth.uid() and s.active
   and (s.role='super_admin' or s.permissions->section ? action)
 );
$$;
revoke all on function public.admin_can(text,text) from public,anon;
grant execute on function public.admin_can(text,text) to authenticated;
insert into public.admin_staff(user_id,role,active)
select id,'super_admin',true from auth.users
where id='5d913ec4-b093-47b2-9d94-58773d262bcb'::uuid
  and lower(email)='craving@gmail.com'
on conflict(user_id) do update set role='super_admin',active=true;
do $$ begin
 if not exists(select 1 from public.admin_staff where user_id='5d913ec4-b093-47b2-9d94-58773d262bcb'::uuid and role='super_admin' and active) then
   raise exception 'The specified account was not found in this project. Check the user ID and email.';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
