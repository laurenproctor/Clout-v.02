alter table visual_assets
  add column if not exists name        text,
  add column if not exists slug        text,
  add column if not exists description text;
