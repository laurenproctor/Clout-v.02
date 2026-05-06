-- Framework Lens: infrastructure for structured framework extraction
--
-- 1. Add content_type discriminator to outputs (routes rendering by output schema)
-- 2. Add lens_type to lenses (routes generation pipeline by lens capability)
-- 3. Seed Framework Lens as a system lens

alter table outputs
  add column if not exists content_type text not null default 'standard';

alter table lenses
  add column if not exists lens_type text;

insert into lenses (
  scope,
  name,
  description,
  lens_type,
  system_prompt,
  tags,
  is_active
) values (
  'system',
  'Framework Lens',
  'Extract the hidden conceptual framework from your thinking — named models, transferable logic, and reusable mental structures.',
  'framework',
  '',
  array['framework', 'strategy', 'thought-leadership', 'mental-models'],
  true
);
