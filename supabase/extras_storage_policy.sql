-- Allow the website (anon/public key) to LIST files in the "extras" storage bucket.
-- The bucket is already public (files open by URL), but listing requires a SELECT policy.
-- Run this once in Supabase Dashboard -> SQL Editor.

drop policy if exists "Public can list extras" on storage.objects;

create policy "Public can list extras"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'extras');
