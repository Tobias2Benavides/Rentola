-- ============================================================
-- Migration: 002_listings.sql
-- Phase 2: Marketplace Supply — listings table + RLS + storage
-- ============================================================

create table public.listings (
    id              uuid        not null default gen_random_uuid(),
    owner_id        uuid        not null references auth.users on delete cascade,
    title           text        not null,
    description     text,
    category        text        not null,
    price_per_day   numeric(10,2) not null check (price_per_day > 0),
    price_per_week  numeric(10,2) check (price_per_week is null or price_per_week > 0),
    city            text        not null,
    photos          text[]      not null default '{}',  -- storage paths in the "listing-photos" bucket
    is_active       boolean     not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    primary key (id)
);

alter table public.listings enable row level security;

-- Active listings are visible to anyone signed in; owners can always see their own (including inactive)
create policy "Authenticated users can view active listings"
    on public.listings for select
    to authenticated
    using ( is_active = true or owner_id = (select auth.uid()) );

create policy "Owners can create their own listings"
    on public.listings for insert
    to authenticated
    with check ( owner_id = (select auth.uid()) );

create policy "Owners can update their own listings"
    on public.listings for update
    to authenticated
    using ( owner_id = (select auth.uid()) )
    with check ( owner_id = (select auth.uid()) );

create policy "Owners can delete their own listings"
    on public.listings for delete
    to authenticated
    using ( owner_id = (select auth.uid()) );

create trigger listings_updated_at
    before update on public.listings
    for each row execute procedure public.set_updated_at();

create index listings_owner_id_idx on public.listings (owner_id);
create index listings_active_idx on public.listings (is_active) where is_active = true;

-- ============================================================
-- Storage: listing-photos bucket + RLS
-- ============================================================

insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true);

create policy "Users can upload their own listing photos"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can manage their own listing photos"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can delete their own listing photos"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Anyone can view listing photos"
    on storage.objects for select
    to public
    using ( bucket_id = 'listing-photos' );
