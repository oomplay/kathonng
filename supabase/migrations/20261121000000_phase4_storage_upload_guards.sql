-- Phase 4 production hardening for anonymous photo uploads.
--
-- Guarantees enforced here:
--   1. The bucket accepts at most 2 MB per object.
--   2. Only raster image MIME types are accepted.
--   3. The INSERT policy repeats both checks, so the guarantee does not
--      depend on the bucket metadata alone.
--   4. Anonymous clients cannot UPDATE or DELETE storage objects: no policy
--      grants those commands, so RLS denies them by default. The database
--      seed rows in `krathongs` / `vote_logs` are protected the same way --
--      only the `increment_vote` RPC (SECURITY DEFINER) mutates vote data.

update storage.buckets
set file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
    updated_at = now()
where id = 'krathong-photos';

drop policy if exists krathong_photos_anon_upload on storage.objects;

create policy krathong_photos_anon_upload
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'krathong-photos'
  and coalesce((metadata ->> 'mimetype'), '') in ('image/png', 'image/jpeg', 'image/webp', 'image/avif')
  and coalesce((metadata ->> 'size')::bigint, 0) <= 2 * 1024 * 1024
);

-- Re-assert that anonymous clients cannot mutate or remove stored objects.
drop policy if exists krathong_photos_anon_update on storage.objects;
drop policy if exists krathong_photos_anon_delete on storage.objects;
