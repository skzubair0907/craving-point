-- Delivery Partner Portal
-- Run this after checkout-setup.sql and delivery-tracking.sql in the Supabase SQL Editor.
-- A delivery partner can only read orders assigned to their own authenticated account.

alter table public.delivery_staff
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.delivery_staff
  add column if not exists email text;

create unique index if not exists delivery_staff_user_id_unique
  on public.delivery_staff(user_id) where user_id is not null;
create unique index if not exists delivery_staff_email_unique
  on public.delivery_staff(lower(email)) where email is not null;

create or replace function public.is_delivery_partner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.delivery_staff
    where active = true and (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email','')))
  );
$$;
revoke all on function public.is_delivery_partner() from public, anon;
grant execute on function public.is_delivery_partner() to authenticated;

-- The rider opens their portal with Google once. Link that authenticated account
-- to the matching rider email automatically, so the manager never has to handle
-- a technical Auth user ID.
create or replace function public.activate_my_delivery_partner_account()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  linked boolean := false;
  linked_count integer := 0;
begin
  update public.delivery_staff
  set user_id = auth.uid()
  where active = true
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''));
  get diagnostics linked_count = row_count;
  linked := linked_count > 0;
  return linked or exists (
    select 1 from public.delivery_staff
    where active = true and user_id = auth.uid()
  );
end $$;
revoke all on function public.activate_my_delivery_partner_account() from public, anon;
grant execute on function public.activate_my_delivery_partner_account() to authenticated;

create or replace function public.delivery_partner_orders()
returns table (
  id uuid,
  order_number text,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
) language sql stable security definer set search_path = public as $$
  select o.id, o.order_number, o.payload, o.created_at, coalesce(d.updated_at, o.created_at)
  from public.order_requests o
  join public.order_admin_details d on d.order_id = o.id
  join public.delivery_staff s on s.id = d.delivery_staff_id
  where s.active = true
    and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email','')))
    and coalesce(o.payload->'meta'->>'orderType', 'delivery') = 'delivery'
    and coalesce(o.payload->>'status', '') in ('ready', 'out_for_delivery')
  order by o.created_at asc;
$$;
revoke all on function public.delivery_partner_orders() from public, anon;
grant execute on function public.delivery_partner_orders() to authenticated;

-- Replaces the admin-only location writer from delivery-tracking.sql. A rider may
-- write location only for an order assigned to their own active delivery_staff row.
create or replace function public.set_delivery_location(
  p_order_number text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_can('orders', 'edit') and not exists (
    select 1 from public.order_requests o
    join public.order_admin_details d on d.order_id = o.id
    join public.delivery_staff s on s.id = d.delivery_staff_id
    where o.order_number = p_order_number
      and s.active = true
      and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email','')))
  ) then
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
    latitude = excluded.latitude, longitude = excluded.longitude,
    accuracy = excluded.accuracy, updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
  insert into public.delivery_tracking_audit(order_number, latitude, longitude, accuracy, updated_at, updated_by)
  values (p_order_number, p_latitude, p_longitude, p_accuracy, now(), auth.uid());
end $$;

create or replace function public.delivery_partner_set_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare current_status text;
begin
  if p_status not in ('out_for_delivery', 'delivered') then
    raise exception 'Invalid delivery status';
  end if;
  select o.payload->>'status' into current_status
  from public.order_requests o
  join public.order_admin_details d on d.order_id = o.id
  join public.delivery_staff s on s.id = d.delivery_staff_id
  where o.id = p_order_id and s.active = true and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email','')));
  if not found then raise exception 'This delivery is not assigned to you'; end if;
  if p_status = 'out_for_delivery' and current_status <> 'ready' then
    raise exception 'Only ready orders can be started';
  end if;
  if p_status = 'delivered' and current_status <> 'out_for_delivery' then
    raise exception 'Start the delivery before marking it delivered';
  end if;
  update public.order_requests
  set payload = jsonb_set(jsonb_set(payload, '{status}', to_jsonb(p_status), true), '{updated_at}', to_jsonb(now()), true)
  where id = p_order_id;
  insert into public.order_history(order_id, status, reason, actor)
  values (p_order_id, p_status, 'Updated by delivery partner', auth.uid());
end $$;
revoke all on function public.delivery_partner_set_status(uuid, text) from public, anon;
grant execute on function public.delivery_partner_set_status(uuid, text) to authenticated;
