-- supabase/migrations/20260506_taste_lens.sql
-- Seeds the Taste Lens system lens record
-- No new tables: reuses outputs with content_type = 'taste'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses WHERE lens_type = 'taste' AND workspace_id IS NULL
  ) THEN
    INSERT INTO lenses (
      scope, name, description, lens_type, system_prompt, tags, is_active
    ) VALUES (
      'system',
      'Taste Lens',
      'Improve discernment, restraint, emotional calibration, and conceptual elegance without flattening creator identity.',
      'taste',
      '',
      array['taste', 'refinement', 'restraint', 'aesthetic'],
      true
    );
  END IF;
END $$;
