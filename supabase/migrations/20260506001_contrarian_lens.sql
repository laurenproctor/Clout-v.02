-- supabase/migrations/20260506_contrarian_lens.sql
-- Seeds the Contrarian Lens system lens record
-- No new tables: reuses outputs with content_type = 'contrarian'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses WHERE lens_type = 'contrarian' AND workspace_id IS NULL
  ) THEN
    INSERT INTO lenses (
      scope, name, description, lens_type, system_prompt, tags, is_active
    ) VALUES (
      'system',
      'Contrarian Lens',
      'Reveal hidden assumptions, structural tensions, and overlooked second-order effects to create distinctive, high-signal thinking.',
      'contrarian',
      '',
      array['contrarian', 'distinction', 'asymmetry', 'tension'],
      true
    );
  END IF;
END $$;
