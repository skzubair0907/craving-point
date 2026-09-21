-- Apply after admin.sql. Safe to rerun.
begin;
create or replace function public.admin_sales_report(p_from date,p_to date,p_export boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not admin_can('reports',case when p_export then 'export' else 'view' end) then raise exception 'Access denied'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Choose a date range of at most 367 days'; end if;
 with selected as (
  select *, (created_at at time zone 'Asia/Kolkata')::date as report_day,
   case when payload->>'payment_status'='paid' then (payload->>'total')::numeric else 0 end received
  from order_requests where created_at >= p_from::timestamp at time zone 'Asia/Kolkata'
   and created_at < (p_to+1)::timestamp at time zone 'Asia/Kolkata'
 ), daily as (select report_day,count(*) orders,sum(received) revenue from selected group by report_day),
 products as (select item->>'productId' product_id,item->>'name' name,sum((item->>'quantity')::integer) quantity,
 sum((item->>'price')::numeric*(item->>'quantity')::integer) gross_sales
 from selected,jsonb_array_elements(payload->'items') item where payload->>'status' not in ('cancelled','awaiting_payment','refunded') group by item->>'productId',item->>'name'),
 methods as (select payload->'meta'->>'payment' method,count(*) orders,sum(received) received from selected group by payload->'meta'->>'payment'),
 coupons as (select payload->'meta'->>'coupon' code,count(*) uses,sum((payload->>'discount')::numeric) discount from selected where coalesce(payload->'meta'->>'coupon','')<>'' group by payload->'meta'->>'coupon')
 select jsonb_build_object(
  'orders',(select count(*) from selected),
  'completed',(select count(*) from selected where payload->>'status'='delivered' or (payload->'meta'->>'orderType'='pickup' and payload->>'status'='picked_up')),
  'revenue',(select coalesce(sum(received),0) from selected),
  'cancelled',(select count(*) from selected where payload->>'status'='cancelled'),
  'refunded',(select count(*) from selected where payload->>'payment_status'='refunded'),
  'average',(select coalesce(avg((payload->>'total')::numeric),0) from selected where payload->>'status' not in ('cancelled','awaiting_payment','refunded')),
  'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by report_day) from daily),'[]'),
  'products',coalesce((select jsonb_agg(to_jsonb(products) order by quantity desc) from products),'[]'),
  'methods',coalesce((select jsonb_agg(to_jsonb(methods)) from methods),'[]'),
  'coupons',coalesce((select jsonb_agg(to_jsonb(coupons)) from coupons),'[]')
 ) into result;
 if p_export then insert into admin_audit(actor,action,details) values(auth.uid(),'reports.export',jsonb_build_object('from',p_from,'to',p_to)); end if;
 return result;
end $$;
revoke all on function public.admin_sales_report(date,date,boolean) from public,anon;
grant execute on function public.admin_sales_report(date,date,boolean) to authenticated;

create or replace function public.record_cash_collection(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare o public.order_requests;
begin
 if not admin_can('orders','edit') then raise exception 'Access denied'; end if;
 select * into o from order_requests where id=p_id for update;
 if not found then raise exception 'Order not found'; end if;
 if (o.payload->'meta'->>'payment') is distinct from 'cod' then raise exception 'Online payments require provider verification'; end if;
 if coalesce(o.payload->>'status','') not in ('delivered','picked_up') then raise exception 'Complete the delivery or pickup first'; end if;
 if o.payload->>'payment_status'='paid' then return; end if;
 if o.payload->>'payment_status'='refunded' then raise exception 'A refunded payment cannot be collected again'; end if;
 update order_requests set payload=jsonb_set(payload,'{payment_status}','"paid"') where id=p_id;
 insert into admin_audit(actor,action,record_id,details) values(auth.uid(),'payment.cash_collected',p_id::text,jsonb_build_object('amount',o.payload->'total'));
end $$;
revoke all on function public.record_cash_collection(uuid) from public,anon;
grant execute on function public.record_cash_collection(uuid) to authenticated;

-- Staff permissions, rather than the old profiles.role flag, control uploads.
drop policy if exists "Admin menu photo uploads" on storage.objects;
create policy "Admin menu photo uploads" on storage.objects for insert to authenticated
with check (bucket_id='menu-images' and public.admin_can('products','edit'));
commit;
