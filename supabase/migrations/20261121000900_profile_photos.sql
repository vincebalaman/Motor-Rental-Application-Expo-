begin;
create table public.profile_photos (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  image_path text not null,
  constraint profile_photo_owner_path check (
    image_path ~ ('^' || user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  )
);
alter table public.profile_photos enable row level security;
revoke all on public.profile_photos from anon, authenticated;
grant select, insert, update on public.profile_photos to authenticated;
create policy profile_photos_self_read on public.profile_photos for select to authenticated using (user_id = (select auth.uid()));
create policy profile_photos_self_insert on public.profile_photos for insert to authenticated with check (user_id = (select auth.uid()));
create policy profile_photos_self_update on public.profile_photos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', false, 5242880, array['image/jpeg']);
create policy profile_images_self_read on storage.objects for select to authenticated
using (bucket_id = 'profile-images' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy profile_images_self_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy profile_images_self_update on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and split_part(name, '/', 1) = (select auth.uid())::text)
with check (bucket_id = 'profile-images' and split_part(name, '/', 1) = (select auth.uid())::text);
-- Retain old uploads: a timed-out profile write may still have committed.
commit;
