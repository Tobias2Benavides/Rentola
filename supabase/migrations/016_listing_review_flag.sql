-- ============================================================
-- Migration: 016_listing_review_flag.sql
-- A listing whose title/description matches a prohibited-item keyword
-- (see web/lib/prohibitedKeywords.ts) is flagged instead of blocked
-- outright -- keyword matching has false positives ("brommer" could be
-- in a joke description, "wapen" could be part of an unrelated word),
-- so a human reviews it rather than the lister being silently rejected.
-- While flagged it's hidden from Browse for everyone but the owner and
-- admins, same visibility shape as a suspended owner's listings from
-- 015_moderation_v2.sql.
-- ============================================================

alter table public.listings add column needs_review boolean not null default false;
alter table public.listings add column flag_reason text;

drop policy "Authenticated users can view active listings" on public.listings;

create policy "Authenticated users can view active listings"
    on public.listings for select
    to authenticated
    using (
        (
            owner_id = (select auth.uid())
            or exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
            or (
                is_active = true
                and needs_review = false
                and not exists (
                    select 1 from public.profiles p
                    where p.id = listings.owner_id and p.suspended_at is not null
                )
            )
        )
        and not exists (
            select 1 from public.blocks
            where (blocker_id = (select auth.uid()) and blocked_id = listings.owner_id)
               or (blocker_id = listings.owner_id and blocked_id = (select auth.uid()))
        )
    );
