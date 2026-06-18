-- supabase/migrations/20260618000_save_image_asset_to_output.sql
-- Promote a generated visual asset to a Studio output (image-only draft), atomically.
--
-- This is a reusable domain primitive — "promote a visual asset to a Studio output" —
-- not an Image-creator one-off. It runs as a single transaction so the two writes
-- (insert output + link asset) can never half-apply (no orphaned output).
--
-- Auth: the app uses Clerk + the Supabase SERVICE ROLE (RLS bypassed), so the caller
-- (an authenticated API route) passes the verified workspace id and the function
-- enforces that the asset belongs to it. The asset row is locked FOR UPDATE so
-- concurrent double-clicks/retries are deterministic and idempotent.
--
-- Idempotent: if the asset is already linked to an output, returns that output with
-- already_linked = true instead of creating a duplicate.

create or replace function save_image_asset_to_output(
  p_asset_id     uuid,
  p_workspace_id uuid,
  p_title        text
)
returns table (output_id uuid, already_linked boolean, asset_id uuid)
language plpgsql
as $$
declare
  v_existing_output uuid;
  v_new_output      uuid;
begin
  -- Lock the asset row; verify ownership in the same statement.
  select va.output_id into v_existing_output
  from visual_assets va
  where va.id = p_asset_id and va.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'asset_not_found' using errcode = 'no_data_found';
  end if;

  -- Already promoted → return the existing link (idempotent).
  if v_existing_output is not null then
    return query select v_existing_output, true, p_asset_id;
    return;
  end if;

  insert into outputs (workspace_id, status, content_type, title, content, channel_id)
  values (
    p_workspace_id,
    'draft',
    'image',
    nullif(btrim(coalesce(p_title, '')), ''),
    jsonb_build_object('body', '', 'selectedVisualAssetId', p_asset_id::text, 'sourceCreator', 'create/image'),
    null
  )
  returning id into v_new_output;

  update visual_assets set output_id = v_new_output where id = p_asset_id;

  return query select v_new_output, false, p_asset_id;
end;
$$;
