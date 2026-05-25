-- Ensure the voice-captures storage bucket exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-captures',
  'voice-captures',
  false,
  52428800, -- 50 MB
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

-- Service role bypasses RLS, but add a policy for authenticated users as fallback
create policy "workspace members can upload voice captures"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'voice-captures');

create policy "workspace members can read voice captures"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'voice-captures');
