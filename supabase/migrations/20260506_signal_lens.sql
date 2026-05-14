DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lenses WHERE lens_type = 'signal' AND workspace_id IS NULL
  ) THEN
    INSERT INTO lenses (
      scope, name, description, lens_type, system_prompt, tags, is_active
    ) VALUES (
      'system',
      'Signal Lens',
      'Identify directional shifts, emerging patterns, and structurally important changes before they become obvious.',
      'signal',
      '',
      array['signal', 'directional', 'future', 'strategy'],
      true
    );
  END IF;
END $$;
