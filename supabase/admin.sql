-- Apply after schema.sql, order_requests.sql and storefront.sql.
begin;
create table if not exists public.admin_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('super_admin','order_manager','product_manager','inventory_manager','delivery_manager','support_staff')),
 permissions jsonb not null default '{}', active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.admin_staff enable row level security;
create or replace function public.admin_can(section text, action text default 'view') returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and (
 exists(select 1 from admin_staff s where s.user_id=auth.uid() and s.active and
 (s.role='super_admin' or s.permissions->section ? action)) or
 (not exists(select 1 from admin_staff s where s.user_id=auth.uid()) and
 exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin')))
$$;
revoke all on function public.admin_can(text,text) from public;
grant execute on function public.admin_can(text,text) to authenticated;
create policy "Read own staff access" on public.admin_staff for select to authenticated using(user_id=auth.uid() or admin_can('staff','view'));
create policy "Manage staff access" on public.admin_staff for all to authenticated using(admin_can('staff','manage')) with check(admin_can('staff','manage') and user_id<>auth.uid());
grant select,insert,update,delete on public.admin_staff to authenticated;

create table if not exists public.admin_audit (
 id bigint generated always as identity primary key, actor uuid, action text not null,
 record_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create policy "Read audit" on public.admin_audit for select to authenticated using(admin_can('audit','view'));
grant select on public.admin_audit to authenticated;
create or replace function public.log_admin_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into admin_audit(actor,action,record_id,details) values(auth.uid(),tg_table_name||'.'||lower(tg_op),
 coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id'),
 jsonb_build_object('operation',tg_op));
 return coalesce(new,old);
end $$;
create trigger audit_staff after insert or update or delete on public.admin_staff for each row execute function public.log_admin_change();
create trigger audit_catalog after insert or update on public.storefront for each row execute function public.log_admin_change();

create table if not exists public.inventory (
 product_id text primary key, quantity integer not null default 0 check(quantity>=0),
 warning_level integer not null default 5 check(warning_level>=0), updated_at timestamptz not null default now()
);
create table if not exists public.stock_history (
 id bigint generated always as identity primary key, product_id text not null,
 change integer not null, quantity_after integer not null, reason text not null,
 actor uuid, order_number text, created_at timestamptz not null default now()
);
alter table public.inventory enable row level security;
alter table public.stock_history enable row level security;
create policy "Staff inventory" on public.inventory for select to authenticated using(admin_can('inventory','view'));
create policy "Staff stock history" on public.stock_history for select to authenticated using(admin_can('inventory','view'));
grant select on public.inventory, public.stock_history to authenticated;
create or replace view public.product_stock as select product_id,quantity from public.inventory;
grant select on public.product_stock to anon,authenticated,service_role;
create or replace function public.adjust_stock(p_product text,p_change integer,p_warning integer,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare q integer;
begin
 if not admin_can('inventory','edit') then raise exception 'Access denied'; end if;
 if length(trim(p_reason))<3 or p_warning<0 then raise exception 'A reason and valid warning level are required'; end if;
 if not exists(select 1 from storefront,jsonb_array_elements(data->'menuItems') x where x->>'id'=p_product) then raise exception 'Product not found'; end if;
 insert into inventory(product_id) values(p_product) on conflict do nothing;
 update inventory set quantity=quantity+p_change,warning_level=p_warning,updated_at=now() where product_id=p_product returning quantity into q;
 insert into stock_history(product_id,change,quantity_after,reason,actor) values(p_product,p_change,q,p_reason,auth.uid());
 insert into admin_audit(actor,action,record_id,details) values(auth.uid(),'inventory.adjust',p_product,jsonb_build_object('change',p_change,'quantity',q,'reason',p_reason));
end $$;
revoke all on function public.adjust_stock(text,integer,integer,text) from public;
grant execute on function public.adjust_stock(text,integer,integer,text) to authenticated;

create table if not exists public.order_history (
 id bigint generated always as identity primary key, order_id uuid not null references order_requests(id),
 status text not null, reason text, actor uuid, created_at timestamptz not null default now()
);
create table if not exists public.delivery_staff (
 id uuid primary key default gen_random_uuid(), name text not null, phone text not null, active boolean not null default true
);
create table if not exists public.order_admin_details (
 order_id uuid primary key references order_requests(id), notes text not null default '',
 delivery_staff_id uuid references delivery_staff(id), delivery_notes text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.admin_notifications (
 id bigint generated always as identity primary key, kind text not null, message text not null, order_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.notification_reads (
 notification_id bigint references admin_notifications(id) on delete cascade, user_id uuid default auth.uid() references auth.users(id), primary key(notification_id,user_id)
);
create table if not exists public.customer_support (
 id uuid primary key default gen_random_uuid(), customer_phone text not null, subject text not null,
 notes text not null default '', status text not null default 'open' check(status in ('open','in_progress','resolved')), created_at timestamptz not null default now()
);
do $$ declare t text; s text; begin
 for t,s in select * from (values ('delivery_staff','delivery'),('order_admin_details','orders'),('customer_support','support')) x(t,s) loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy staff_read on public.%I for select to authenticated using (admin_can(%L,''view''))',t,s);
 execute format('create policy staff_insert on public.%I for insert to authenticated with check (admin_can(%L,''create''))',t,s);
 execute format('create policy staff_update on public.%I for update to authenticated using (admin_can(%L,''edit'')) with check(admin_can(%L,''edit''))',t,s,s);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 execute format('create trigger audit_changes after insert or update on public.%I for each row execute function public.log_admin_change()',t);
 end loop;
end $$;
alter table public.order_history enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.notification_reads enable row level security;
create policy "Read order timeline" on public.order_history for select to authenticated using(admin_can('orders','view'));
create policy "Read notifications" on public.admin_notifications for select to authenticated using(admin_can('notifications','view'));
create policy "Own notification reads" on public.notification_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and admin_can('notifications','view'));
grant select on public.order_history,public.admin_notifications to authenticated;
grant select,insert,delete on public.notification_reads to authenticated;
create index on public.order_history(order_id,created_at);
create index on public.admin_audit(created_at desc);
create index on public.order_requests(created_at desc);
create index on public.order_requests((payload->>'status'));

-- Inventory is reserved atomically when an order is saved, including orders awaiting payment.
-- Cancellation releases the reservation exactly once. Untracked products remain made-to-order.
create or replace function public.order_inventory_events() returns trigger language plpgsql security definer set search_path=public as $$
declare i record; q integer; direction integer;
begin
 direction := case when tg_op='INSERT' then -1 when new.payload->>'status'='cancelled' and old.payload->>'status'<>'cancelled' then 1 else 0 end;
 if direction<>0 then
 for i in select x->>'productId' as product,sum((x->>'quantity')::integer)::integer as qty from jsonb_array_elements(new.payload->'items') x group by x->>'productId' order by x->>'productId' loop
 update inventory set quantity=quantity+direction*i.qty,updated_at=now() where product_id=i.product returning quantity into q;
 if found then
 insert into stock_history(product_id,change,quantity_after,reason,actor,order_number) values(i.product,direction*i.qty,q,case when direction=-1 then 'Order reservation' else 'Order cancelled' end,auth.uid(),new.order_number);
 if q<=(select warning_level from inventory where product_id=i.product) then insert into admin_notifications(kind,message,order_id) values('stock','Low stock: '||i.product||' ('||q||' remaining)',new.id); end if;
 end if;
 end loop;
 end if;
 if tg_op='INSERT' or new.payload->>'status' is distinct from old.payload->>'status' then
 insert into order_history(order_id,status,actor,reason) values(new.id,new.payload->>'status',auth.uid(),new.payload->>'status_reason');
 insert into admin_notifications(kind,message,order_id) values('order',new.order_number||': '||(new.payload->>'status'),new.id);
 insert into admin_audit(actor,action,record_id,details) values(auth.uid(),'order.status',new.id::text,jsonb_build_object('status',new.payload->>'status','reason',new.payload->>'status_reason'));
 end if;
 return new;
end $$;
create trigger order_inventory after insert or update on public.order_requests for each row execute function public.order_inventory_events();

-- Keep the tested transition function private. All staff changes go through this wrapper.
alter function public.set_order_status(uuid,text) rename to transition_order_internal;
revoke all on function public.transition_order_internal(uuid,text) from public,anon,authenticated;
create or replace function public.set_order_status(p_id uuid,p_status text,p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not admin_can('orders','edit') then raise exception 'Access denied'; end if;
 if p_status='cancelled' and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Cancellation reason is required'; end if;
 if p_status='cancelled' then update order_requests set payload=jsonb_set(payload,'{status_reason}',to_jsonb(p_reason)) where id=p_id; end if;
 perform transition_order_internal(p_id,p_status);
end $$;
revoke all on function public.set_order_status(uuid,text,text) from public,anon;
grant execute on function public.set_order_status(uuid,text,text) to authenticated;
revoke insert,update,delete on public.order_requests from authenticated;
drop policy if exists "Admins can manage order requests" on public.order_requests;
create policy "Staff read orders" on public.order_requests for select to authenticated using(admin_can('orders','view') or admin_can('reports','view'));

-- Section-scoped publication with optimistic concurrency; no direct JSON writes by staff.
revoke insert,update,delete on public.storefront from authenticated;
create or replace function public.publish_catalog(p_section text,p_value jsonb,p_revision integer) returns integer
language plpgsql security definer set search_path=public as $$
declare s text; result integer;
begin
 s := case p_section when 'menuItems' then 'products' when 'categories' then 'products' when 'coupons' then 'coupons' when 'restaurantSettings' then 'settings' when 'offers' then 'content' else null end;
 if s is null or not admin_can(s,'edit') then raise exception 'Access denied'; end if;
 if jsonb_typeof(p_value) is distinct from (case when p_section='restaurantSettings' then 'object' else 'array' end) then
   raise exception 'Invalid catalog data';
 end if;
 if p_section='menuItems' and exists(select 1 from jsonb_array_elements(p_value) x where coalesce(x->>'name','')='' or (x->>'price')::numeric<0 or not (x ? 'id')) then raise exception 'Invalid product'; end if;
 update storefront set data=jsonb_set(data,array[p_section],p_value),revision=revision+1 where id=1 and revision=p_revision returning revision into result;
 if result is null then raise exception 'Catalog changed or was not initialized. Refresh and try again.'; end if;
 return result;
end $$;
revoke all on function public.publish_catalog(text,jsonb,integer) from public,anon;
grant execute on function public.publish_catalog(text,jsonb,integer) to authenticated;
commit;
