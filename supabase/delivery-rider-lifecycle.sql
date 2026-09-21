-- Authoritative rider lifecycle
-- Run once in the Supabase SQL Editor after checkout-setup.sql,
-- delivery-partner-portal.sql and delivery-trust-and-earnings.sql.
--
-- This extends the existing order record; it does not create a second order
-- system. Every rider action is checked against the logged-in assigned rider.

create or replace function public.assign_delivery_partner(
  p_order_id uuid,
  p_delivery_staff_id uuid,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare current_status text;
begin
  if not public.admin_can('orders', 'edit') then raise exception 'Access denied'; end if;
  select payload->>'status' into current_status from public.order_requests where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if current_status <> 'ready' then raise exception 'Only ready orders can be assigned to a rider'; end if;
  if not exists (select 1 from public.delivery_staff where id = p_delivery_staff_id and active = true) then
    raise exception 'Choose an active delivery rider';
  end if;

  insert into public.order_admin_details(order_id, delivery_staff_id, notes, updated_at)
  values (p_order_id, p_delivery_staff_id, nullif(trim(coalesce(p_notes, '')), ''), now())
  on conflict (order_id) do update set
    delivery_staff_id = excluded.delivery_staff_id,
    notes = excluded.notes,
    updated_at = now();

  update public.order_requests
  set payload = jsonb_set(jsonb_set(payload, '{status}', to_jsonb('rider_assigned'::text), true), '{updated_at}', to_jsonb(now()), true)
  where id = p_order_id;
  insert into public.order_history(order_id, status, reason, actor)
  values (p_order_id, 'rider_assigned', 'Rider assigned by restaurant', auth.uid());
end $$;
revoke all on function public.assign_delivery_partner(uuid, uuid, text) from public, anon;
grant execute on function public.assign_delivery_partner(uuid, uuid, text) to authenticated;

create or replace function public.delivery_partner_orders()
returns table (id uuid, order_number text, payload jsonb, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.order_number, o.payload, o.created_at, coalesce(d.updated_at, o.created_at)
  from public.order_requests o
  join public.order_admin_details d on d.order_id = o.id
  join public.delivery_staff s on s.id = d.delivery_staff_id
  where s.active = true
    and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email', '')))
    and coalesce(o.payload->'meta'->>'orderType', 'delivery') = 'delivery'
    and coalesce(o.payload->>'status', '') in ('rider_assigned', 'rider_accepted', 'picked_up', 'out_for_delivery', 'arrived')
  order by o.created_at asc;
$$;

create or replace function public.delivery_partner_advance_order(p_order_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare current_status text; next_status text; history_reason text;
begin
  select o.payload->>'status' into current_status
  from public.order_requests o
  join public.order_admin_details d on d.order_id = o.id
  join public.delivery_staff s on s.id = d.delivery_staff_id
  where o.id = p_order_id and s.active = true
    and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email', '')));
  if not found then raise exception 'This delivery is not assigned to you'; end if;

  case p_action
    when 'accept' then next_status := 'rider_accepted'; history_reason := 'Rider accepted delivery job';
    when 'pickup' then next_status := 'picked_up'; history_reason := 'Rider confirmed order pickup';
    when 'start' then next_status := 'out_for_delivery'; history_reason := 'Rider started delivery';
    when 'arrive' then next_status := 'arrived'; history_reason := 'Rider arrived at customer';
    else raise exception 'Invalid rider action';
  end case;

  if (p_action = 'accept' and current_status <> 'rider_assigned')
    or (p_action = 'pickup' and current_status <> 'rider_accepted')
    or (p_action = 'start' and current_status <> 'picked_up')
    or (p_action = 'arrive' and current_status <> 'out_for_delivery') then
    raise exception 'That rider action is not available for the current order status';
  end if;

  update public.order_requests
  set payload = jsonb_set(jsonb_set(payload, '{status}', to_jsonb(next_status), true), '{updated_at}', to_jsonb(now()), true)
  where id = p_order_id;
  if p_action = 'start' then
    insert into public.delivery_verifications(order_id, otp)
    values (p_order_id, lpad((floor(random() * 10000))::text, 4, '0'))
    on conflict (order_id) do update set otp = excluded.otp, created_at = now(), verified_at = null, verified_by = null;
  end if;
  insert into public.order_history(order_id, status, reason, actor)
  values (p_order_id, next_status, history_reason, auth.uid());
end $$;
revoke all on function public.delivery_partner_advance_order(uuid, text) from public, anon;
grant execute on function public.delivery_partner_advance_order(uuid, text) to authenticated;

create or replace function public.delivery_partner_confirm_delivery(p_order_id uuid, p_otp text)
returns void language plpgsql security definer set search_path = public as $$
declare expected_otp text;
begin
  if not exists (
    select 1 from public.order_requests o join public.order_admin_details d on d.order_id = o.id
    join public.delivery_staff s on s.id = d.delivery_staff_id
    where o.id = p_order_id and s.active = true
      and (s.user_id = auth.uid() or lower(s.email) = lower(coalesce(auth.jwt()->>'email', '')))
      and o.payload->>'status' = 'arrived'
  ) then raise exception 'Mark arrival before confirming delivery'; end if;
  select otp into expected_otp from public.delivery_verifications where order_id = p_order_id;
  if expected_otp is null then raise exception 'Delivery confirmation code is not ready yet'; end if;
  if trim(p_otp) <> expected_otp then raise exception 'The customer code does not match'; end if;
  update public.delivery_verifications set verified_at = now(), verified_by = auth.uid() where order_id = p_order_id;
  update public.order_requests set payload = jsonb_set(jsonb_set(payload, '{status}', to_jsonb('delivered'::text), true), '{updated_at}', to_jsonb(now()), true) where id = p_order_id;
  insert into public.order_history(order_id, status, reason, actor) values (p_order_id, 'delivered', 'Delivery confirmed with customer OTP', auth.uid());
end $$;
revoke all on function public.delivery_partner_confirm_delivery(uuid, text) from public, anon;
grant execute on function public.delivery_partner_confirm_delivery(uuid, text) to authenticated;
