-- ============================================================
-- Migration: 017_rental_agreement_and_handover.sql
-- Per-booking Rental Agreement acceptance (server-enforced, not just a
-- client checkbox -- request_rental now requires p_agreement_accepted),
-- plus timestamped handover photos at pickup/return so a damage or
-- condition dispute has evidence from both sides (see the Rental
-- Agreement, Section 2 and 4).
-- ============================================================

alter table public.rentals add column agreement_accepted_at timestamptz;

-- Postgres treats a different parameter list as a different overload, not
-- a replacement -- without this drop, the old 4-arg version would stay
-- callable and bypass the new agreement-acceptance requirement entirely.
drop function if exists public.request_rental(uuid, date, date, text);

create or replace function public.request_rental(
    p_listing_id uuid,
    p_start_date date,
    p_end_date date,
    p_message text,
    p_agreement_accepted boolean
)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_listing public.listings;
    v_days int;
    v_rental public.rentals;
    v_conflict boolean;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if not coalesce(p_agreement_accepted, false) then
        raise exception 'You must accept the Rental Agreement to request a booking';
    end if;

    select * into v_listing from public.listings where id = p_listing_id and is_active = true;
    if v_listing is null then
        raise exception 'Listing not found or no longer active';
    end if;

    if v_listing.owner_id = auth.uid() then
        raise exception 'You cannot rent your own listing';
    end if;

    if exists (
        select 1 from public.blocks
        where (blocker_id = auth.uid() and blocked_id = v_listing.owner_id)
           or (blocker_id = v_listing.owner_id and blocked_id = auth.uid())
    ) then
        raise exception 'You cannot request this listing';
    end if;

    if p_end_date <= p_start_date then
        raise exception 'End date must be after start date';
    end if;

    if p_start_date < current_date then
        raise exception 'Start date cannot be in the past';
    end if;

    select exists (
        select 1
        from public.rentals
        where listing_id = p_listing_id
          and status in ('approved', 'active')
          and daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
    ) into v_conflict;

    if v_conflict then
        raise exception 'Those dates are already booked';
    end if;

    v_days := p_end_date - p_start_date;

    insert into public.rentals (
        listing_id, owner_id, renter_id, start_date, end_date, message, total_price, agreement_accepted_at
    )
    values (
        p_listing_id, v_listing.owner_id, auth.uid(), p_start_date, p_end_date,
        nullif(p_message, ''), v_days * v_listing.price_per_day, now()
    )
    returning * into v_rental;

    insert into public.notifications (user_id, type, title, body, link)
    values (
        v_listing.owner_id,
        'rental_requested',
        'New rental request',
        'Someone wants to rent "' || v_listing.title || '" from ' || p_start_date || ' to ' || p_end_date || '.',
        '/rentals/' || v_rental.id
    );

    return v_rental;
end;
$$;

grant execute on function public.request_rental(uuid, date, date, text, boolean) to authenticated;

-- ============================================================

create table public.handover_photos (
    id                  uuid        not null default gen_random_uuid(),
    rental_id           uuid        not null references public.rentals on delete cascade,
    uploaded_by         uuid        not null references auth.users on delete cascade,
    stage               text        not null check (stage in ('pickup', 'return')),
    photo_path          text        not null,
    condition_ok        boolean     not null,
    issue_description   text,
    created_at          timestamptz not null default now(),
    primary key (id),
    constraint issue_description_required check (condition_ok or issue_description is not null)
);

alter table public.handover_photos enable row level security;

create policy "Rental participants can view handover photos"
    on public.handover_photos for select
    to authenticated
    using (
        exists (
            select 1 from public.rentals r
            where r.id = rental_id
              and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
        )
        or exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
    );

create policy "Rental participants can add handover photos"
    on public.handover_photos for insert
    to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and exists (
            select 1 from public.rentals r
            where r.id = rental_id
              and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
        )
    );

create index handover_photos_rental_id_idx on public.handover_photos (rental_id, stage);

-- ============================================================
-- Storage: handover-photos bucket (private) + RLS, scoped the same way
-- as handover_photos rows -- both parties to the rental, plus admins.
-- ============================================================

insert into storage.buckets (id, name, public) values ('handover-photos', 'handover-photos', false);

create policy "Rental participants can upload handover photos"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'handover-photos'
        and exists (
            select 1 from public.rentals r
            where r.id::text = (storage.foldername(name))[1]
              and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
        )
    );

create policy "Rental participants can view handover photos"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'handover-photos'
        and (
            exists (
                select 1 from public.rentals r
                where r.id::text = (storage.foldername(name))[1]
                  and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
            )
            or exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin = true)
        )
    );
