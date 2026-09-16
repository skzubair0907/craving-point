-- Metrics aggregation table and functions for delivery tracking
-- Aggregates recent writes from delivery_tracking_audit into a compact metrics table

create table if not exists public.delivery_tracking_metrics (
  order_number text primary key,
  last_write timestamptz,
  writes_count integer,
  avg_accuracy double precision,
  min_accuracy double precision,
  max_accuracy double precision,
  window_minutes integer,
  updated_at timestamptz default now()
);

create or replace function public.aggregate_delivery_tracking_metrics(p_minutes integer default 60, p_limit integer default 1000)
returns void language plpgsql security definer as $$
begin
  with agg as (
    select order_number,
           count(*) as writes_count,
           avg(accuracy)::double precision as avg_accuracy,
           min(accuracy)::double precision as min_accuracy,
           max(accuracy)::double precision as max_accuracy,
           max(updated_at) as last_write
    from public.delivery_tracking_audit
    where updated_at > now() - (p_minutes || ' minutes')::interval
    group by order_number
    order by writes_count desc
    limit p_limit
  )
  insert into public.delivery_tracking_metrics (order_number,last_write,writes_count,avg_accuracy,min_accuracy,max_accuracy,window_minutes,updated_at)
  select order_number,last_write,writes_count,avg_accuracy,min_accuracy,max_accuracy,p_minutes,now() from agg
  on conflict (order_number) do update set
    last_write = excluded.last_write,
    writes_count = excluded.writes_count,
    avg_accuracy = excluded.avg_accuracy,
    min_accuracy = excluded.min_accuracy,
    max_accuracy = excluded.max_accuracy,
    window_minutes = excluded.window_minutes,
    updated_at = excluded.updated_at;
end
$$;

create or replace function public.refresh_delivery_tracking_metrics(p_minutes integer default 60)
returns boolean language plpgsql security definer as $$
begin
  perform public.aggregate_delivery_tracking_metrics(p_minutes);
  return true;
end
$$;

revoke all on function public.aggregate_delivery_tracking_metrics(integer, integer) from public, anon;
grant execute on function public.aggregate_delivery_tracking_metrics(integer, integer) to service_role;
revoke all on function public.refresh_delivery_tracking_metrics(integer) from public, anon;
grant execute on function public.refresh_delivery_tracking_metrics(integer) to service_role;

-- Optional: schedule with pg_cron if available (runs daily at 03:10 UTC)
-- create extension if not exists pg_cron;
-- select cron.schedule('aggregate_delivery_tracking_metrics', '10 3 * * *', 'select public.aggregate_delivery_tracking_metrics(60,1000)');
