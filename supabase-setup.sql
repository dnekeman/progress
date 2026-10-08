create table if not exists public.service_progress (
    service_key text primary key,
    wso2_service text not null,
    java_service_name text not null,
    version text not null,
    sort_order integer not null unique,
    tests_created boolean not null default false,
    test_successful boolean not null default false,
    live_on_prd boolean not null default false,
    deployed_on_acc boolean not null default false,
    deployed_on_prd boolean not null default false
);

insert into public.service_progress (
    service_key, wso2_service, java_service_name, version, sort_order,
    tests_created, test_successful, live_on_prd, deployed_on_acc, deployed_on_prd
) values
    ('MarketingPermissieService', 'SalesforceMarketingAdapterService', 'MarketingPermissieService', 'V2', 1, true, false, false, true, true),
    ('MarketingPermissieService::2', 'MarketingPermissieService', 'MarketingPermissieService', 'V2', 2, true, false, false, true, true),
    ('SalesforceDnAAdapterService', 'SalesforceFacturatieAdapterService', 'SalesforceDnAAdapterService', 'V2', 3, true, false, false, true, false),
    ('SalesforceDnAAdapterService::2', 'SalesforceVerkoopAdapterService', 'SalesforceDnAAdapterService', 'V2', 4, true, false, false, true, false),
    ('SalesforceDnAAdapterService::3', '(Deels)SalesforceDnAAdapterService', 'SalesforceDnAAdapterService', 'V2', 5, true, false, false, true, false),
    ('FacturatieService', 'SapFacturatieAdapterService', 'FacturatieService', 'V2', 6, true, false, false, true, false),
    ('FacturatieService::2', 'FacturatieService', 'FacturatieService', 'V2', 7, true, false, false, true, false),
    ('KickbackService', 'KickbackService', 'KickbackService', 'V2', 8, false, false, false, true, false),
    ('KlantContactService', 'KlantContactService', 'KlantContactService', 'V2', 9, true, false, false, true, false),
    ('Orderservice', 'SapOrderAdapterService', 'Orderservice', 'V2', 10, false, false, false, false, false),
    ('Orderservice::2', 'OrderService', 'Orderservice', 'V2', 11, false, false, false, false, false),
    ('AccountAdministratieService', 'AccountAdministratieService', 'AccountAdministratieService', 'V2', 12, false, false, false, false, false),
    ('SalesforceRelatieAdapterService', 'SalesforceRelatieAdapterService?', 'SalesforceRelatieAdapterService', 'V2', 13, false, false, false, false, false),
    ('RelatieAdministratieService', 'SalesforceRelatieAdapterService?', 'RelatieAdministratieService', 'V5', 14, false, false, false, false, false),
    ('RelatieAdministratieService::2', 'RelatieAdministratieService', 'RelatieAdministratieService', 'V5', 15, false, false, false, false, false),
    ('SapRelatieAdapterService', 'SapRelatieAdapterService', 'SapRelatieAdapterService', 'V3', 16, false, false, false, false, false),
    ('LidmaatschapService', 'LidmaatschapService', 'LidmaatschapService', 'V3', 17, false, false, false, false, false),
    ('RelatieActiviteitService', 'RelatieActiviteitService', 'RelatieActiviteitService', 'V2', 18, false, false, false, false, false),
    ('SapContractAdapterService', 'SapContractAdapterService', 'SapContractAdapterService', 'V2', 19, false, false, false, false, false),
    ('SalesforceGeneriekAdapterService (Library van maken)', 'SalesforceGeneriekAdapterService', 'SalesforceGeneriekAdapterService (Library van maken)', 'N/A', 20, false, false, false, false, false),
    ('ClaimDataService? (Wordt dit gebruikt?)', 'ClaimDataService?', 'ClaimDataService? (Wordt dit gebruikt?)', 'V2', 21, false, false, false, false, false),
    ('SwiftOnlineAdapterService', 'SwiftOnlineAdapterService', 'SwiftOnlineAdapterService', 'V2', 22, false, false, false, false, false),
    ('VluchtclaimAdapterService', 'VluchtclaimAdapterService', 'VluchtclaimAdapterService', 'V2', 23, false, false, false, false, false),
    ('VoordeelcoachAdapterService', 'VoordeelcoachAdapterService', 'VoordeelcoachAdapterService', 'V2', 24, false, false, false, false, false),
    ('FritsAdapterService', 'FritsAdapterService', 'FritsAdapterService', 'V2', 25, false, false, false, false, false),
    ('HomeQgoAdapterService', 'HomeQgoAdapterService', 'HomeQgoAdapterService', 'V2', 26, false, false, false, false, false),
    ('ConsumentenclaimAdapterService', 'ConsumentenclaimAdapterService', 'ConsumentenclaimAdapterService', 'V2', 27, false, false, false, false, false)
on conflict (service_key) do nothing;

alter table public.service_progress enable row level security;
revoke all on table public.service_progress from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.service_progress to anon, authenticated;
grant update (tests_created, test_successful, live_on_prd, deployed_on_acc, deployed_on_prd)
    on table public.service_progress to anon, authenticated;

drop policy if exists "Invited team can read progress" on public.service_progress;
drop policy if exists "Public can read progress" on public.service_progress;
create policy "Public can read progress"
    on public.service_progress for select to anon, authenticated using (true);

drop policy if exists "Invited team can update progress" on public.service_progress;
drop policy if exists "Public can update progress" on public.service_progress;
create policy "Public can update progress"
    on public.service_progress for update to anon, authenticated
    using (true) with check (true);

create or replace function public.reorder_service_progress(service_keys text[])
returns void
language plpgsql
security definer
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

    select count(distinct supplied.service_key)
    into unique_key_count
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
    into staging_offset
    from public.service_progress;

    update public.service_progress
    set sort_order = sort_order + staging_offset
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
grant execute on function public.reorder_service_progress(text[]) to anon, authenticated;

notify pgrst, 'reload schema';