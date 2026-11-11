-- Policies for the "extras" storage bucket used by the Extras page.
-- The bucket is public (files open by URL). These policies let the website:
--   * LIST files (required for the page to find catalogs/images)
--   * UPLOAD / REPLACE / DELETE files from the Extras page "Add" and trash buttons
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.

drop policy if exists "Public can list extras" on storage.objects;
create policy "Public can list extras"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'extras');

drop policy if exists "Portal can upload extras" on storage.objects;
create policy "Portal can upload extras"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'extras');

drop policy if exists "Portal can update extras" on storage.objects;
create policy "Portal can update extras"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'extras')
  with check (bucket_id = 'extras');

drop policy if exists "Portal can delete extras" on storage.objects;
create policy "Portal can delete extras"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'extras');
