-- Run once to enable durable guest checkout snapshots.
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.order_requests enable row level security;
create policy "Admins can manage order requests" on public.order_requests
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Prevent customers from changing their own administrator role.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, email, avatar_url) on public.profiles to authenticated;
