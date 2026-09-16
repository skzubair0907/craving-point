-- Cleanup function to delete old audit rows from delivery_tracking_audit.
-- Adjust retention by passing a different number of days to the function.

create or replace function public.cleanup_delivery_tracking_audit(p_days integer default 30)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.delivery_tracking_audit where updated_at < now() - (p_days || ' days')::interval;
end
$$;

-- Grant execute to service role; admins can run this too.
revoke all on function public.cleanup_delivery_tracking_audit(integer) from public, anon;
grant execute on function public.cleanup_delivery_tracking_audit(integer) to service_role;

-- If your Postgres host has the pg_cron extension available, you can schedule a daily job like this:
-- (Uncomment and run once on the database to create the scheduled job.)

-- create extension if not exists pg_cron;
-- select cron.schedule('cleanup_delivery_tracking_audit', '0 3 * * *', 'select public.cleanup_delivery_tracking_audit(30)');

-- Alternatively, run the function from your host or CI on a cron schedule:
-- psql $DATABASE_URL -c "select public.cleanup_delivery_tracking_audit(30);"
