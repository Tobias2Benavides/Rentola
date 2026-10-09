-- ============================================================
-- Migration: 015_moderation_v2.sql
-- Generalizes reports from listing-only to any target (listing, user,
-- message, booking), adds an admin role, account suspension, and an
-- audit trail of moderation actions with the statement-of-reasons the
-- DSA (Art. 17) requires for a removal/suspension decision.
--
-- The reports table is dropped and recreated rather than ALTERed --
-- it's empty (pre-launch, checked before writing this migration), and
-- a clean recreate is simpler than threading target_type/target_id
-- through the old listing_id-only shape.
--
-- All inserts into reports happen through the server route
-- (app/api/reports/route.ts) using the admin client, not through an
-- RLS insert policy -- that's what lets a logged-out visitor file a
-- report by email, and keeps reporter-identity validation in one
-- place instead of duplicated between an RLS policy and a route.
-- ============================================================

alter table public.profiles add column is_admin boolean not null default false;
alter table public.profiles add column suspended_at timestamptz;
alter table public.profiles add column suspension_reason text;

-- ============================================================

drop table if exists public.reports;

create table public.reports (
    id              uuid        not null default gen_random_uuid(),
    reporter_id     uuid        references auth.users on delete set null,
    reporter_email  text,
    target_type     text        not null check (target_type in ('listing', 'user', 'message', 'booking')),
    target_id       uuid        not null,
    reason          text        not null check (reason in (
        'illegal_prohibited_item', 'stolen_item', 'scam_fraud', 'harassment',
        'fake_listing', 'safety_issue', 'ip_infringement', 'other'
    )),
    details         text,
    evidence_paths  text[]      not null default '{}',
    status          text        not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
    created_at      timestamptz not null default now(),
    resolved_at     timestamptz,
    resolution_note text,
    primary key (id),
    constraint report_has_reporter check (reporter_id is not null or reporter_email is not null)
);

alter table public.reports enable row level security;

create policy "Reporters can view their own reports"
    on public.reports for select
    to authenticated
    using ( reporter_id = (select auth.uid()) );

create policy "Admins can view all reports"
    on public.reports for select
    to authenticated
    using ( exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true) );

create policy "Admins can update reports"
    on public.reports for update
    to authenticated
    using ( exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true) )
    with check ( exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true) );

create index reports_target_idx on public.reports (target_type, target_id);
create index reports_status_idx on public.reports (status);

-- ============================================================

create table public.moderation_actions (
    id                  uuid        not null default gen_random_uuid(),
    target_type         text        not null check (target_type in ('listing', 'user', 'message', 'booking')),
    target_id           uuid        not null,
    action              text        not null check (action in (
        'listing_removed', 'listing_restored', 'user_suspended', 'user_unsuspended',
        'report_dismissed', 'report_actioned', 'note_added'
    )),
    reason              text        not null,
    based_on_report_id  uuid        references public.reports on delete set null,
    created_by          uuid        not null references auth.users on delete cascade,
    created_at          timestamptz not null default now(),
    primary key (id)
);

alter table public.moderation_actions enable row level security;

-- A user can see the moderation actions taken against their own account --
-- this is the "how to contest" record the Terms promise them.
create policy "Affected user can view their own moderation actions"
    on public.moderation_actions for select
    to authenticated
    using ( target_type = 'user' and target_id = (select auth.uid()) );

create policy "Admins can view all moderation actions"
    on public.moderation_actions for select
    to authenticated
    using ( exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true) );

-- Inserts happen only from the SECURITY DEFINER RPCs below (each checks
-- is_admin itself) -- no insert policy for regular users.

create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);

-- ============================================================
-- RPC: resolve_report
-- Admin marks a report reviewing / actioned / dismissed, with a note.
-- Doesn't itself remove a listing or suspend a user -- pair it with
-- remove_listing / suspend_user from the admin UI when the report is
-- upheld, same as a human reviewer would do two separate things.
-- ============================================================

create or replace function public.resolve_report(
    p_report_id uuid,
    p_status text,
    p_resolution_note text
)
returns public.reports
language plpgsql
security definer set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_report public.reports;
begin
    select is_admin into v_is_admin from public.profiles where id = auth.uid();
    if not coalesce(v_is_admin, false) then
        raise exception 'Only admins can resolve reports';
    end if;
    if p_status not in ('reviewing', 'actioned', 'dismissed') then
        raise exception 'Invalid status';
    end if;

    update public.reports
    set status = p_status,
        resolution_note = nullif(p_resolution_note, ''),
        resolved_at = case when p_status in ('actioned', 'dismissed') then now() else resolved_at end
    where id = p_report_id
    returning * into v_report;

    if v_report is null then
        raise exception 'Report not found';
    end if;

    if p_status in ('actioned', 'dismissed') then
        insert into public.moderation_actions (target_type, target_id, action, reason, based_on_report_id, created_by)
        values (
            v_report.target_type,
            v_report.target_id,
            case when p_status = 'actioned' then 'report_actioned' else 'report_dismissed' end,
            coalesce(nullif(p_resolution_note, ''), 'No note provided'),
            v_report.id,
            auth.uid()
        );
    end if;

    return v_report;
end;
$$;

grant execute on function public.resolve_report(uuid, text, text) to authenticated;

-- ============================================================
-- RPC: remove_listing
-- Deactivates a listing and tells the owner what happened, why, and
-- how to contest it (DSA Art. 17 statement of reasons).
-- ============================================================

create or replace function public.remove_listing(
    p_listing_id uuid,
    p_reason text,
    p_based_on_report_id uuid default null
)
returns public.listings
language plpgsql
security definer set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_listing public.listings;
begin
    select is_admin into v_is_admin from public.profiles where id = auth.uid();
    if not coalesce(v_is_admin, false) then
        raise exception 'Only admins can remove a listing';
    end if;

    update public.listings set is_active = false where id = p_listing_id returning * into v_listing;
    if v_listing is null then
        raise exception 'Listing not found';
    end if;

    insert into public.moderation_actions (target_type, target_id, action, reason, based_on_report_id, created_by)
    values ('listing', v_listing.id, 'listing_removed', p_reason, p_based_on_report_id, auth.uid());

    insert into public.notifications (user_id, type, title, body, link)
    values (
        v_listing.owner_id,
        'listing_removed',
        'Your listing was removed',
        '"' || v_listing.title || '" was removed from Rentify. Reason: ' || p_reason ||
            case when p_based_on_report_id is not null then ' (following a user report).' else '.' end ||
            ' If you believe this was a mistake, reply to this notification or email the address on our Contact page to contest it.',
        '/contact'
    );

    return v_listing;
end;
$$;

grant execute on function public.remove_listing(uuid, text, uuid) to authenticated;

-- ============================================================
-- RPC: suspend_user / unsuspend_user
-- ============================================================

create or replace function public.suspend_user(
    p_user_id uuid,
    p_reason text,
    p_permanent boolean,
    p_based_on_report_id uuid default null
)
returns public.profiles
language plpgsql
security definer set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_profile public.profiles;
begin
    select is_admin into v_is_admin from public.profiles where id = auth.uid();
    if not coalesce(v_is_admin, false) then
        raise exception 'Only admins can suspend a user';
    end if;
    if p_user_id = auth.uid() then
        raise exception 'Cannot suspend your own account';
    end if;

    update public.profiles
    set suspended_at = now(), suspension_reason = p_reason
    where id = p_user_id
    returning * into v_profile;

    if v_profile is null then
        raise exception 'User not found';
    end if;

    insert into public.moderation_actions (target_type, target_id, action, reason, based_on_report_id, created_by)
    values (
        'user', p_user_id, 'user_suspended',
        (case when p_permanent then '[Permanent] ' else '[Temporary] ' end) || p_reason,
        p_based_on_report_id, auth.uid()
    );

    insert into public.notifications (user_id, type, title, body, link)
    values (
        p_user_id,
        'account_suspended',
        'Your account has been suspended',
        'Your Rentify account was ' || (case when p_permanent then 'permanently' else 'temporarily' end) ||
            ' suspended. Reason: ' || p_reason ||
            case when p_based_on_report_id is not null then ' (following a user report).' else '.' end ||
            ' If you believe this was a mistake, reply to this notification or email the address on our Contact page to contest it.',
        '/contact'
    );

    return v_profile;
end;
$$;

grant execute on function public.suspend_user(uuid, text, boolean, uuid) to authenticated;

create or replace function public.unsuspend_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer set search_path = ''
as $$
declare
    v_is_admin boolean;
    v_profile public.profiles;
begin
    select is_admin into v_is_admin from public.profiles where id = auth.uid();
    if not coalesce(v_is_admin, false) then
        raise exception 'Only admins can unsuspend a user';
    end if;

    update public.profiles
    set suspended_at = null, suspension_reason = null
    where id = p_user_id
    returning * into v_profile;

    if v_profile is null then
        raise exception 'User not found';
    end if;

    insert into public.moderation_actions (target_type, target_id, action, reason, created_by)
    values ('user', p_user_id, 'user_unsuspended', 'Suspension lifted', auth.uid());

    return v_profile;
end;
$$;

grant execute on function public.unsuspend_user(uuid) to authenticated;

-- ============================================================
-- Hide listings owned by a suspended user from everyone except the
-- owner and admins (mirrors the blocks-visibility policy already here).
-- ============================================================

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

-- ============================================================
-- Storage: report-evidence bucket (private) + RLS
-- Only logged-in reporters attach evidence (see app/api/reports/route.ts) --
-- an anonymous report has no bucket folder to scope access to.
-- ============================================================

insert into storage.buckets (id, name, public) values ('report-evidence', 'report-evidence', false);

create policy "Users can upload their own report evidence"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'report-evidence'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Reporters can view their own report evidence"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'report-evidence'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Admins can view all report evidence"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'report-evidence'
        and exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
    );
