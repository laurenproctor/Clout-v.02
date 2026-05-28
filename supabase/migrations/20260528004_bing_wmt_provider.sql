-- supabase/migrations/20260528004_bing_wmt_provider.sql

-- Extend analytics_connections.provider to include bing_wmt
alter table analytics_connections
  drop constraint analytics_connections_provider_check;

alter table analytics_connections
  add constraint analytics_connections_provider_check
  check (provider in ('ga4', 'gsc', 'bing_wmt'));

-- Extend analytics_properties.property_type to include bing_wmt_site
alter table analytics_properties
  drop constraint analytics_properties_property_type_check;

alter table analytics_properties
  add constraint analytics_properties_property_type_check
  check (property_type in ('ga4_property', 'gsc_site', 'bing_wmt_site'));
