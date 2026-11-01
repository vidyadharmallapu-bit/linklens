-- ============================================================================
-- LinkLens Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ============================================================================
-- STEP 1: MANUAL DASHBOARD ACTION REQUIRED (before running this SQL)
-- ============================================================================
-- Create the storage bucket manually in the Supabase Dashboard:
--
--   1. Go to Storage > New bucket
--   2. Name: linklens-images
--   3. Toggle "Public bucket" OFF (private bucket — access via signed URLs only)
--   4. File size limit: 10 MB  (10485760 bytes)
--   5. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--   6. Click "Save"
--
-- The bucket is PRIVATE. Signed URLs are generated on-demand for sharing.
-- AI platforms (ChatGPT, Gemini, Claude) can fetch images via signed URLs.
-- ============================================================================


-- ============================================================================
-- STEP 2: Images metadata table
-- ============================================================================

create table if not exists public.images (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        references auth.users(id) on delete cascade not null,
  file_name             text        not null,
  file_size             bigint      not null check (file_size > 0 and file_size <= 10485760),
  mime_type             text        not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  width                 integer     not null default 0 check (width >= 0),
  height                integer     not null default 0 check (height >= 0),
  storage_path          text        not null,
  is_public             boolean     not null default false,
  signed_url            text,
  signed_url_expires_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Composite index: fast per-user gallery queries ordered by date
create index if not exists idx_images_user_created
  on public.images (user_id, created_at desc);

-- Index for storage path lookups (used during deletion)
create index if not exists idx_images_storage_path
  on public.images (storage_path);


-- ============================================================================
-- STEP 3: Row Level Security (RLS)
-- Users can only access their own images.
-- ============================================================================

alter table public.images enable row level security;

-- SELECT: users can view only their own images
drop policy if exists "Users can view own images" on public.images;
create policy "Users can view own images"
  on public.images
  for select
  using (auth.uid() = user_id);

-- INSERT: users can only insert rows with their own user_id
drop policy if exists "Users can insert own images" on public.images;
create policy "Users can insert own images"
  on public.images
  for insert
  with check (auth.uid() = user_id);

-- UPDATE: users can only update their own rows
drop policy if exists "Users can update own images" on public.images;
create policy "Users can update own images"
  on public.images
  for update
  using (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
drop policy if exists "Users can delete own images" on public.images;
create policy "Users can delete own images"
  on public.images
  for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- STEP 4: Storage Bucket RLS Policies (PRIVATE BUCKET)
-- Run AFTER creating the bucket via the Dashboard (Step 1).
-- ============================================================================

-- Authenticated read: users can read their own files (for signed URL generation)
drop policy if exists "Users can read own images" on storage.objects;
create policy "Users can read own images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'linklens-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated upload: users can only upload into their own <user_id>/ prefix
drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'linklens-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated delete: users can only delete files they own
drop policy if exists "Users can delete their own uploaded images" on storage.objects;
create policy "Users can delete their own uploaded images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'linklens-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- NOTE: Public access is provided via SIGNED URLs (JWT tokens), not bucket policies.
-- Signed URLs are generated by the application and embed expiry time.
-- They work for AI platforms (ChatGPT, Gemini, Claude) without authentication.
-- True revocation is not possible — distributed signed URLs remain valid until expiry.


-- ============================================================================
-- STEP 5: updated_at trigger (optional but recommended)
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_images_updated_at on public.images;
create trigger set_images_updated_at
  before update on public.images
  for each row execute procedure public.handle_updated_at();
