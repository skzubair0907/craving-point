-- Order → kitchen → rider workflow guard
-- Run once in the Supabase SQL Editor after checkout-setup.sql and
-- delivery-partner-portal.sql.
--
-- This makes the critical hand-off server-enforced: an admin cannot move a
-- delivery order to "out_for_delivery" until it is assigned to an active rider.

create or replace function public.set_order_status(
  p_id uuid,
  p_status text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_type text;
begin
  if not public.admin_can('orders', 'edit') then
    raise exception 'Access denied';
  end if;

  if p_status = 'cancelled' and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Cancellation reason is required';
  end if;

  select o.payload->'meta'->>'orderType'
  into order_type
  from public.order_requests o
  where o.id = p_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_status = 'out_for_delivery' and coalesce(order_type, 'delivery') = 'delivery'
    and not exists (
      select 1
      from public.order_admin_details d
      join public.delivery_staff s on s.id = d.delivery_staff_id
      where d.order_id = p_id and s.active = true
    ) then
    raise exception 'Assign an active delivery rider before starting delivery';
  end if;

  if p_status = 'cancelled' then
    update public.order_requests
    set payload = jsonb_set(payload, '{status_reason}', to_jsonb(p_reason))
    where id = p_id;
  end if;

  perform public.transition_order_internal(p_id, p_status);
end;
$$;

revoke all on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;
