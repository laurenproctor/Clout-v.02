-- Mastodon federated channel support
-- Per-instance app registration cache (client_id/secret vary per Mastodon server)
create table mastodon_app_registrations (
  id               uuid primary key default gen_random_uuid(),
  instance_url     text not null unique,   -- normalized: https://host (no trailing slash)
  client_id        text not null,
  client_secret    text not null,
  software_name    text,                   -- 'mastodon' | 'glitch' | 'akkoma' | etc.
  software_version text,
  max_characters   integer,               -- instance-specific post length limit
  created_at       timestamptz not null default now()
);

alter table mastodon_app_registrations enable row level security;
-- service role only — no client access policy needed

-- Extend the channel_platform enum
alter type channel_platform add value if not exists 'mastodon';
