-- Create push_send_logs table to record web-push send attempts
begin;

create table if not exists public.push_send_logs (
  id bigint generated always as identity primary key,
  order_number text,
  subscription_id bigint,
  endpoint text,
  status text not null,
  response jsonb,
  error text,
  created_at timestamptz not null default now()
);

alter table public.push_send_logs enable row level security;

-- Allow admins to view logs
create policy "Read push send logs" on public.push_send_logs for select to authenticated using (admin_can('audit','view'));

grant select on public.push_send_logs to authenticated;

commit;
