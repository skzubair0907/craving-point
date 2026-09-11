-- Run once in Supabase SQL Editor. Safe to run again.
-- Existing order permissions remain in force; no public access is granted.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'order_requests'
  ) then
    alter publication supabase_realtime add table public.order_requests;
  end if;
end $$;
