-- ============================================================
-- Migration: 001_foundation.sql
-- Phase 1: Foundation — users/profiles table + RLS + trigger
-- ============================================================

-- 1. profiles table (public, separate from auth.users)
-- auth.users is managed by Supabase Auth — never write to it directly.
-- The profiles table extends it with app-specific data.
create table public.profiles (
    id              uuid        not null references auth.users on delete cascade,
    display_name    text,
    bio             text,
    avatar_url      text,       -- storage path, e.g. "avatars/{user_id}/avatar.jpeg"
    average_rating  numeric(3,2) default 0,  -- Phase 4 populates; Phase 1 renders placeholder
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now(),
    primary key (id)
);

-- 2. Enable RLS immediately (before any data, before any app traffic)
alter table public.profiles enable row level security;

-- 3. RLS Policies
-- [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security]

-- Anyone authenticated can read any profile (needed for owner cards on listings in Phase 2)
create policy "Authenticated users can view profiles"
    on public.profiles for select
    to authenticated
    using (true);

-- Users can only insert their own profile row (trigger handles this, but policy enforces it)
create policy "Users can create their own profile"
    on public.profiles for insert
    to authenticated
    with check ( (select auth.uid()) = id );

-- Users can only update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using ( (select auth.uid()) = id )
    with check ( (select auth.uid()) = id );

-- 4. Trigger: auto-create a profile row on auth.users insert (signup)
-- security definer required to write to public.profiles from auth context
-- [VERIFIED: supabase.com/docs/guides/auth/managing-user-data]
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 5. updated_at auto-update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.set_updated_at();

-- ============================================================
-- Storage: avatars bucket + RLS
-- ============================================================

-- Create avatars bucket (private — access controlled by RLS)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false);

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own avatar"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Allow authenticated users to update (replace) their own avatar
create policy "Users can update their own avatar"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Allow public read (avatars are visible to all users)
create policy "Anyone can view avatars"
    on storage.objects for select
    to public
    using ( bucket_id = 'avatars' );
