-- supabase/migrations/20260506_authority_lens.sql
-- Seeds the Authority Lens system lens record
-- No new tables: reuses outputs with content_type = 'authority'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses WHERE lens_type = 'authority' AND workspace_id IS NULL
  ) THEN
    INSERT INTO lenses (
      scope, name, description, lens_type, system_prompt, tags, is_active
    ) VALUES (
      'system',
      'Authority Lens',
      'Strengthen the credibility architecture of your thinking — trust mechanisms, evidence-backed claims, and structural authority.',
      'authority',
      '',
      array['authority', 'credibility', 'evidence', 'trust'],
      true
    );
  END IF;
END $$;
