-- ============================================================
-- Migration: 019_listing_location.sql
-- Adds an optional precise location to a listing -- a free-text
-- address plus coordinates, used to render a map pin and a "Get
-- directions" link. All nullable: existing listings keep working
-- with no location until the owner edits them to add one.
--
-- Public, same visibility as the existing `city` field -- covered
-- automatically by the row-level "Authenticated users can view
-- active listings" policy, no RLS change needed for new columns.
-- ============================================================

alter table public.listings add column address text;
alter table public.listings add column latitude double precision check (latitude is null or latitude between -90 and 90);
alter table public.listings add column longitude double precision check (longitude is null or longitude between -180 and 180);
