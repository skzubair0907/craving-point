-- Run after schema.sql and order_requests.sql. Safe to rerun.
create table if not exists public.storefront (
  id integer primary key check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision > 0)
);
alter table public.storefront enable row level security;
drop policy if exists "Public storefront" on public.storefront;
create policy "Public storefront" on public.storefront for select using (true);
drop policy if exists "Admin storefront" on public.storefront;
create policy "Admin storefront" on public.storefront for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant select on public.storefront to anon, authenticated;
grant insert, update, delete on public.storefront to authenticated;

alter table public.order_requests add column if not exists tracking_token text;
alter table public.order_requests add column if not exists request_id uuid;
alter table public.order_requests add column if not exists request_hash text;
alter table public.order_requests add column if not exists payment_order_id text;
alter table public.order_requests add column if not exists payment_id text;
create unique index if not exists order_request_id_unique on public.order_requests(request_id) where request_id is not null;
create unique index if not exists order_payment_unique on public.order_requests(payment_order_id) where payment_order_id is not null;
grant all on public.order_requests to service_role;
grant select, update on public.order_requests to authenticated;

-- Update payment state atomically without overwriting a restaurant status edit.
create or replace function public.confirm_order_payment(p_order_number text, p_payment_id text)
returns public.order_requests language plpgsql security definer set search_path = public as $$
declare result public.order_requests;
begin
  update public.order_requests set
    payment_id = p_payment_id,
    payload = jsonb_set(jsonb_set(payload, '{payment_status}', '"paid"'::jsonb), '{status}',
      case when payload->>'status' = 'awaiting_payment' then '"placed"'::jsonb else payload->'status' end)
  where order_number = p_order_number returning * into result;
  return result;
end $$;
revoke all on function public.confirm_order_payment(text, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(text, text) to service_role;

create or replace function public.set_order_status(p_id uuid, p_status text)
returns void language plpgsql security invoker set search_path = public as $$
declare current_order public.order_requests; current_status text;
begin
  select * into current_order from public.order_requests where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  current_status := current_order.payload->>'status';
  if current_status in ('delivered', 'picked_up', 'cancelled') then raise exception 'This order is already closed'; end if;
  if p_status not in ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled') then raise exception 'Invalid status'; end if;
  if p_status <> 'cancelled' and current_order.payload->>'payment_status' <> 'paid' and current_order.payload->'meta'->>'payment' = 'online' then raise exception 'Payment must be confirmed first'; end if;
  if p_status <> 'cancelled' and not (
    (current_status in ('placed', 'ORDER_PLACED') and p_status = 'confirmed') or
    (current_status = 'confirmed' and p_status = 'preparing') or
    (current_status = 'preparing' and p_status = 'ready') or
    (current_status = 'ready' and p_status = 'out_for_delivery' and current_order.payload->'meta'->>'orderType' = 'delivery') or
    (current_status = 'out_for_delivery' and p_status = 'delivered') or
    (current_status = 'ready' and p_status = 'picked_up' and current_order.payload->'meta'->>'orderType' = 'pickup')
  ) then raise exception 'This status transition is not allowed'; end if;
  update public.order_requests set payload = jsonb_set(jsonb_set(payload, '{status}', to_jsonb(p_status)), '{updated_at}', to_jsonb(now())) where id = p_id;
end $$;
revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- Product image uploads are restricted to authenticated administrators.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
drop policy if exists "Public menu photos" on storage.objects;
create policy "Public menu photos" on storage.objects for select using (bucket_id = 'menu-images');
drop policy if exists "Admin menu photo uploads" on storage.objects;
create policy "Admin menu photo uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'menu-images' and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null references public.order_requests(order_number),
  name text not null,
  rating integer not null check (rating between 1 and 5),
  review text not null check (char_length(review) between 3 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.customer_reviews enable row level security;
drop policy if exists "Admin customer reviews" on public.customer_reviews;
create policy "Admin customer reviews" on public.customer_reviews for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
grant all on public.customer_reviews to service_role;
grant select, update, delete on public.customer_reviews to authenticated;
-- Only this view is public. Order numbers are deliberately excluded.
create or replace view public.published_reviews as
select id, name, rating, review, created_at from public.customer_reviews where approved = true;
grant select on public.published_reviews to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'storefront') then
    alter publication supabase_realtime add table public.storefront;
  end if;
end $$;
