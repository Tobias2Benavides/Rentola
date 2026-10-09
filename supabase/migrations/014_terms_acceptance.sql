-- ============================================================
-- Migration: 014_terms_acceptance.sql
-- Click-wrap acceptance records for the three documents every user
-- agrees to (terms, rental agreement, privacy). CURRENT_TERMS_VERSION
-- lives in web/lib/legal.ts -- when it's bumped, any user whose latest
-- row per document is behind gets a blocking re-acceptance modal (see
-- TermsGateModal / app/(app)/layout.tsx).
--
-- Plain insert/select RLS, no RPC needed: a user can only ever write
-- their own acceptance, so there's no business rule to enforce beyond
-- row ownership -- same shape as reports/blocks in 011_moderation.sql.
-- ============================================================

create table public.terms_acceptances (
    id          uuid        not null default gen_random_uuid(),
    user_id     uuid        not null references auth.users on delete cascade,
    document    text        not null check (document in ('terms', 'rental_agreement', 'privacy')),
    version     int         not null,
    accepted_at timestamptz not null default now(),
    user_agent  text,
    primary key (id)
);

alter table public.terms_acceptances enable row level security;

create policy "Users can view their own terms acceptances"
    on public.terms_acceptances for select
    to authenticated
    using ( user_id = (select auth.uid()) );

create policy "Users can record their own terms acceptance"
    on public.terms_acceptances for insert
    to authenticated
    with check ( user_id = (select auth.uid()) );

create index terms_acceptances_user_id_idx on public.terms_acceptances (user_id, document, version);
