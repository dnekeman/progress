create table if not exists public.service_progress (
    service_key text primary key,
    wso2_service text not null,
    java_service_name text not null,
    version text not null,
    sort_order integer not null unique check (sort_order > 0),
    tests_created boolean not null default false,
    test_successful boolean not null default false,
    live_on_prd boolean not null default false,
    deployed_on_acc boolean not null default false,
    deployed_on_prd boolean not null default false
);

revoke all on table public.service_progress from public;

create or replace function public.reorder_service_progress(service_keys text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
    existing_count bigint;
    unique_key_count bigint;
    staging_offset bigint;
begin
    lock table public.service_progress in exclusive mode;

    select count(*) into existing_count from public.service_progress;
    if service_keys is null or cardinality(service_keys) <> existing_count then
        raise exception 'The order must include every service exactly once.';
    end if;

    select count(distinct supplied.service_key) into unique_key_count
    from unnest(service_keys) as supplied(service_key);
    if unique_key_count <> existing_count then
        raise exception 'The order contains duplicate service keys.';
    end if;

    if exists (
        select 1 from public.service_progress as current_service
        where not (current_service.service_key = any(service_keys))
    ) then
        raise exception 'The order contains unknown service keys.';
    end if;

    select coalesce(max(sort_order), 0) + existing_count + 1
    into staging_offset from public.service_progress;

    update public.service_progress set sort_order = sort_order + staging_offset
    where service_key = any(service_keys);

    with requested_order as (
        select supplied.service_key, supplied.ordinality::integer as position
        from unnest(service_keys) with ordinality as supplied(service_key, ordinality)
    )
    update public.service_progress as service
    set sort_order = requested_order.position
    from requested_order
    where service.service_key = requested_order.service_key;
end;
$$;

revoke all on function public.reorder_service_progress(text[]) from public;