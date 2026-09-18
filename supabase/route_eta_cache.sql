-- Route ETA cache table for server-side ETA unification
begin;

create table if not exists public.route_eta_cache (
  id bigint generated always as identity primary key,
  key text unique not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  duration_seconds integer,
  geometry jsonb,
  fetched_at timestamptz not null default now(),
  ttl_seconds integer not null default 300
);

alter table public.route_eta_cache enable row level security;
create policy "Read route ETA" on public.route_eta_cache for select to authenticated using (true);
create policy "Insert route ETA" on public.route_eta_cache for insert to authenticated with check (admin_can('reports','create'));
create policy "Update route ETA" on public.route_eta_cache for update to authenticated with check (admin_can('reports','edit'));

grant select on public.route_eta_cache to authenticated, anon;

commit;
