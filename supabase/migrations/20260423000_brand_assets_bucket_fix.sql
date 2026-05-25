-- Make brand-assets bucket public so logo URLs work in the browser
UPDATE storage.buckets
SET public = true
WHERE id = 'brand-assets';

-- Drop incorrect RLS policies that compared folder name to user ID
-- (the folder is workspace_id, not user_id)
DROP POLICY IF EXISTS "workspace members can read brand assets" ON storage.objects;
DROP POLICY IF EXISTS "workspace members can upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "workspace members can delete brand assets" ON storage.objects;

-- Re-create policies scoped to workspace membership
CREATE POLICY "workspace members can upload brand assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspace members can delete brand assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = (storage.foldername(name))[1]::uuid
        AND user_id = auth.uid()
    )
  );
