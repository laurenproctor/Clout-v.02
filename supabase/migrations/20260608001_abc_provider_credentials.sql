-- supabase/migrations/20260608001_abc_provider_credentials.sql
-- Generic workspace-level credential store for non-OAuth providers.
-- Credentials are stored once per workspace per provider; channels reference them.
-- Includes version tracking for credential formats and encryption key rotation.

-- 1. Generic provider credential store (one row per workspace x provider)
create table workspace_provider_credentials (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  provider              text not null,
  encrypted_data        text not null,
  credential_version    integer not null default 1,
  key_version           integer not null default 1,
  connected_by          uuid,
  last_validated_at     timestamptz,
  last_validation_error text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (workspace_id, provider)
);

alter table workspace_provider_credentials enable row level security;

-- 2. Add provider_credential_id FK to channels (nullable)
alter table channels
  add column if not exists provider_credential_id uuid
    references workspace_provider_credentials(id) on delete set null;

-- 3. Add apple_business_connect to the platform enum
-- Note: ALTER TYPE cannot run inside a transaction in Supabase
alter type channel_platform add value if not exists 'apple_business_connect';

-- 4. ABC-specific metadata columns on channels
-- Three-level hierarchy: company -> business (brand) -> location
alter table channels
  add column if not exists apple_company_id    text,
  add column if not exists apple_business_id   text,
  add column if not exists apple_location_id   text,
  add column if not exists apple_location_name text,
  add column if not exists apple_address       jsonb;
