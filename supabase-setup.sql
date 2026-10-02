create table if not exists public.service_progress (
    service_key text primary key,
    wso2_service text not null,
    java_service_names text[] not null,
    version text not null,
    sort_order integer not null unique,
    playwright_tests boolean not null default false,
    load_tests boolean not null default false,
    acc boolean not null default false,
    prd boolean not null default false
);

insert into public.service_progress (
    service_key, wso2_service, java_service_names, version, sort_order,
    playwright_tests, load_tests, acc, prd
) values
    ('MarketingPermissieService', 'MarketingPermissieService', array['SalesforceMarketingAdapterService', 'MarketingPermissieService']::text[], 'V2', 1, true, true, true, true),
    ('SalesforceDnAAdapterService', 'SalesforceDnAAdapterService', array['SalesforceFacturatieAdapterService', 'SalesforceVerkoopAdapterService (Deels)', 'SalesforceDnAAdapterService']::text[], 'V2', 2, true, false, true, false),
    ('FacturatieService', 'FacturatieService', array['SapFacturatieAdapterService', 'FacturatieService']::text[], 'V2', 3, true, false, true, false),
    ('KickbackService', 'KickbackService', array['KickbackService']::text[], 'V2', 4, false, false, true, false),
    ('KlantContactService', 'KlantContactService', array['KlantContactService']::text[], 'V2', 5, true, false, true, false),
    ('Orderservice', 'Orderservice', array['SapOrderAdapterService', 'OrderService']::text[], 'V2', 6, false, false, false, false),
    ('AccountAdministratieService', 'AccountAdministratieService', array['AccountAdministratieService']::text[], 'V2', 7, false, false, false, false),
    ('SalesforceRelatieAdapterService', 'SalesforceRelatieAdapterService', array['SalesforceRelatieAdapterService?']::text[], 'V2', 8, false, false, false, false),
    ('RelatieAdministratieService', 'RelatieAdministratieService', array['SalesforceRelatieAdapterService?', 'RelatieAdministratieService']::text[], 'V5', 9, false, false, false, false),
    ('SapRelatieAdapterService', 'SapRelatieAdapterService', array['SapRelatieAdapterService']::text[], 'V3', 10, false, false, false, false),
    ('LidmaatschapService', 'LidmaatschapService', array['LidmaatschapService']::text[], 'V3', 11, false, false, false, false),
    ('RelatieActiviteitService', 'RelatieActiviteitService', array['RelatieActiviteitService']::text[], 'V2', 12, false, false, false, false),
    ('SapContractAdapterService', 'SapContractAdapterService', array['SapContractAdapterService']::text[], 'V2', 13, false, false, false, false),
    ('SalesforceGeneriekAdapterService (Library van maken)', 'SalesforceGeneriekAdapterService (Library van maken)', array['SalesforceGeneriekAdapterService']::text[], 'N/A', 14, false, false, false, false),
    ('ClaimDataService? (Wordt dit gebruikt?)', 'ClaimDataService? (Wordt dit gebruikt?)', array['ClaimDataService?']::text[], 'V2', 15, false, false, false, false),
    ('SwiftOnlineAdapterService', 'SwiftOnlineAdapterService', array['SwiftOnlineAdapterService']::text[], 'V2', 16, false, false, false, false),
    ('VluchtclaimAdapterService', 'VluchtclaimAdapterService', array['VluchtclaimAdapterService']::text[], 'V2', 17, false, false, false, false),
    ('VoordeelcoachAdapterService', 'VoordeelcoachAdapterService', array['VoordeelcoachAdapterService']::text[], 'V2', 18, false, false, false, false),
    ('FritsAdapterService', 'FritsAdapterService', array['FritsAdapterService']::text[], 'V2', 19, false, false, false, false),
    ('HomeQgoAdapterService', 'HomeQgoAdapterService', array['HomeQgoAdapterService']::text[], 'V2', 20, false, false, false, false),
    ('ConsumentenclaimAdapterService', 'ConsumentenclaimAdapterService', array['ConsumentenclaimAdapterService']::text[], 'V2', 21, false, false, false, false)
on conflict (service_key) do nothing;

alter table public.service_progress enable row level security;
revoke all on table public.service_progress from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.service_progress to anon, authenticated;
grant update (playwright_tests, load_tests, acc, prd)
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