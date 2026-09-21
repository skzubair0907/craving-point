-- One-time handover cleanup: remove all test/customer order records.
-- Run this in the Supabase SQL Editor only after you have exported anything
-- you need. This is irreversible after COMMIT.
--
-- It preserves the menu, restaurant settings, staff accounts, delivery staff,
-- customer profiles, and current inventory quantities.

begin;

create temporary table order_cleanup_targets on commit drop as
select id, order_number
from public.order_requests;

-- These tables do not all have foreign-key cascades, so remove their records
-- before deleting the parent orders.
delete from public.admin_notifications
where order_id in (select id from order_cleanup_targets);

delete from public.order_history
where order_id in (select id from order_cleanup_targets);

delete from public.order_admin_details
where order_id in (select id from order_cleanup_targets);

delete from public.stock_history
where order_number in (select order_number from order_cleanup_targets);

delete from public.admin_audit
where record_id in (
  select id::text from order_cleanup_targets
  union
  select order_number from order_cleanup_targets
);

-- Delivery tracking, delivery tracking audit, rider earnings, and historical
-- verification records reference the order with ON DELETE CASCADE.
delete from public.order_requests;

commit;

-- Verify that the admin order list is empty:
select count(*) as remaining_orders from public.order_requests;
