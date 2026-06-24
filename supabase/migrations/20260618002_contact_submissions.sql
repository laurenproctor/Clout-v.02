create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table contact_submissions enable row level security;
-- All access via service role only — no client-facing policies needed
