-- Secure, optional rider-location storage for Craving Point.
-- Apply after checkout-setup.sql. It does not grant customer/anon table access.

create table if not exists public.delivery_tracking (
  order_number text primary key references public.order_requests(order_number) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision check (accuracy is null or accuracy >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.delivery_tracking enable row level security;

drop policy if exists "Staff read delivery locations" on public.delivery_tracking;
create policy "Staff read delivery locations" on public.delivery_tracking
  for select to authenticated using (public.admin_can('orders', 'view'));

drop policy if exists "Staff manage delivery locations" on public.delivery_tracking;
create policy "Staff manage delivery locations" on public.delivery_tracking
  for all to authenticated
  using (public.admin_can('orders', 'edit'))
  with check (public.admin_can('orders', 'edit'));

grant select, insert, update on public.delivery_tracking to authenticated;
grant all on public.delivery_tracking to service_role;

-- Audit table for delivery location writes. Useful for debugging and retention.
create table if not exists public.delivery_tracking_audit (
  id bigserial primary key,
  order_number text references public.order_requests(order_number) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
grant insert on public.delivery_tracking_audit to service_role;
grant select on public.delivery_tracking_audit to authenticated;

create or replace function public.set_delivery_location(
  p_order_number text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_can('orders', 'edit') then
    raise exception 'Access denied';
  end if;
  if not exists (select 1 from public.order_requests where order_number = p_order_number) then
    raise exception 'Order not found';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 or p_accuracy < 0 then
    raise exception 'Invalid delivery location';
  end if;

  insert into public.delivery_tracking(order_number, latitude, longitude, accuracy, updated_at, updated_by)
  values (p_order_number, p_latitude, p_longitude, p_accuracy, now(), auth.uid())
  on conflict (order_number) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy = excluded.accuracy,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
  -- Log the write to the audit table for debugging / historical trace.
  insert into public.delivery_tracking_audit(order_number, latitude, longitude, accuracy, updated_at, updated_by)
  values (p_order_number, p_latitude, p_longitude, p_accuracy, now(), auth.uid());
end $$;

revoke all on function public.set_delivery_location(text, double precision, double precision, double precision) from public, anon;
grant execute on function public.set_delivery_location(text, double precision, double precision, double precision) to authenticated;
