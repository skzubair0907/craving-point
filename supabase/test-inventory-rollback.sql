-- Run ONLY in a staging/test project after migrations. Everything rolls back.
-- This checks real trigger behavior, including failure rollback and cancellation idempotency.
begin;
insert into public.inventory(product_id,quantity,warning_level) values('__inventory_test__',3,1);
insert into public.order_requests(id,order_number,payload) values('00000000-0000-4000-8000-000000000001','TEST-INVENTORY',
 '{"status":"placed","items":[{"productId":"__inventory_test__","quantity":2}],"meta":{"payment":"cod","orderType":"pickup"}}');
do $$ begin
 if (select quantity from public.inventory where product_id='__inventory_test__')<>1 then raise exception 'Reservation failed'; end if;
 begin
 insert into public.order_requests(order_number,payload) values('TEST-OVERSELL','{"status":"placed","items":[{"productId":"__inventory_test__","quantity":2}]}');
 raise exception 'Oversell unexpectedly succeeded';
 exception when check_violation then null;
 end;
 if exists(select 1 from public.order_requests where order_number='TEST-OVERSELL') then raise exception 'Failed order persisted'; end if;
end $$;
update public.order_requests set payload=jsonb_set(payload,'{status}','"cancelled"') where order_number='TEST-INVENTORY';
update public.order_requests set payload=jsonb_set(payload,'{status}','"cancelled"') where order_number='TEST-INVENTORY';
do $$ begin
 if (select quantity from public.inventory where product_id='__inventory_test__')<>3 then raise exception 'Cancellation did not restore exactly once'; end if;
end $$;
rollback;
