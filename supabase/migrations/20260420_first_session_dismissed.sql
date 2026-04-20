alter table profiles
  add column if not exists first_session_dismissed_at timestamptz;
