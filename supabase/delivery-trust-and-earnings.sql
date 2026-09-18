-- Delivery OTP and rider earnings. Run after delivery-partner-portal.sql.
-- The code is never readable through browser table access; only the customer API
-- and the assigned rider's confirmation function use it.

create table if not exists public.delivery_verifications (
  order_id uuid primary key references public.order_requests(id) on delete cascade,
  otp text not null check (otp ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);
alter table public.delivery_verifications enable row level security;
revoke all on public.delivery_verifications from anon, authenticated;
grant select on public.delivery_verifications to service_role;

create or replace function public.delivery_partner_confirm_delivery(p_order_id uuid, p_otp text)
returns void language plpgsql security definer set search_path = public as $$
declare expected_otp text;
begin
  if not exists (
    select 1 from public.order_requests o join public.order_admin_details d on d.order_id=o.id
    join public.delivery_staff s on s.id=d.delivery_staff_id
    where o.id=p_order_id and s.active=true and (s.user_id=auth.uid() or lower(s.email)=lower(coalesce(auth.jwt()->>'email',''))) and o.payload->>'status'='out_for_delivery'
  ) then raise exception 'This active delivery is not assigned to you'; end if;
  select otp into expected_otp from public.delivery_verifications where order_id=p_order_id;
  if expected_otp is null then raise exception 'Delivery confirmation code is not ready yet'; end if;
  if trim(p_otp) <> expected_otp then raise exception 'The customer code does not match'; end if;
  update public.delivery_verifications set verified_at=now(),verified_by=auth.uid() where order_id=p_order_id;
  update public.order_requests set payload=jsonb_set(jsonb_set(payload,'{status}',to_jsonb('delivered'::text),true),'{updated_at}',to_jsonb(now()),true) where id=p_order_id;
  insert into public.order_history(order_id,status,reason,actor) values(p_order_id,'delivered','Delivery confirmed with customer OTP',auth.uid());
end $$;
revoke all on function public.delivery_partner_confirm_delivery(uuid,text) from public, anon;
grant execute on function public.delivery_partner_confirm_delivery(uuid,text) to authenticated;

-- Generate the customer code only when the assigned rider begins the journey.
create or replace function public.delivery_partner_set_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare current_status text;
begin
  if p_status <> 'out_for_delivery' then raise exception 'Only starting a delivery is allowed here'; end if;
  select o.payload->>'status' into current_status from public.order_requests o join public.order_admin_details d on d.order_id=o.id join public.delivery_staff s on s.id=d.delivery_staff_id where o.id=p_order_id and s.active=true and (s.user_id=auth.uid() or lower(s.email)=lower(coalesce(auth.jwt()->>'email','')));
  if not found then raise exception 'This delivery is not assigned to you'; end if;
  if current_status <> 'ready' then raise exception 'Only ready orders can be started'; end if;
  update public.order_requests set payload=jsonb_set(jsonb_set(payload,'{status}',to_jsonb('out_for_delivery'::text),true),'{updated_at}',to_jsonb(now()),true) where id=p_order_id;
  insert into public.delivery_verifications(order_id,otp) values(p_order_id,lpad((floor(random()*10000))::text,4,'0')) on conflict(order_id) do update set otp=excluded.otp,created_at=now(),verified_at=null,verified_by=null;
  insert into public.order_history(order_id,status,reason,actor) values(p_order_id,'out_for_delivery','Delivery started by partner',auth.uid());
end $$;
revoke all on function public.delivery_partner_set_status(uuid,text) from public, anon;
grant execute on function public.delivery_partner_set_status(uuid,text) to authenticated;

create or replace function public.delivery_partner_earnings()
returns table(completed_deliveries bigint, delivery_earnings numeric, cash_collected numeric)
language sql stable security definer set search_path = public as $$
 select count(*)::bigint,
   coalesce(sum(coalesce((o.payload->>'delivery')::numeric,0)),0),
   coalesce(sum(case when o.payload->'meta'->>'payment'='cod' then coalesce((o.payload->>'total')::numeric,0) else 0 end),0)
 from public.order_requests o join public.order_admin_details d on d.order_id=o.id join public.delivery_staff s on s.id=d.delivery_staff_id
 where s.active=true and (s.user_id=auth.uid() or lower(s.email)=lower(coalesce(auth.jwt()->>'email',''))) and o.payload->>'status'='delivered'
$$;
revoke all on function public.delivery_partner_earnings() from public, anon;
grant execute on function public.delivery_partner_earnings() to authenticated;
