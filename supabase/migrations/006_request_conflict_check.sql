-- ============================================================
-- Migration: 006_request_conflict_check.sql
-- Reject a rental request outright if it overlaps an existing
-- approved/active booking, instead of letting it sit as 'pending'
-- until the owner discovers the conflict at approval time.
-- ============================================================

create or replace function public.request_rental(
    p_listing_id uuid,
    p_start_date date,
    p_end_date date,
    p_message text
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

    select * into v_listing from public.listings where id = p_listing_id and is_active = true;
    if v_listing is null then
        raise exception 'Listing not found or no longer active';
    end if;

    if v_listing.owner_id = auth.uid() then
        raise exception 'You cannot rent your own listing';
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

    insert into public.rentals (listing_id, owner_id, renter_id, start_date, end_date, message, total_price)
    values (p_listing_id, v_listing.owner_id, auth.uid(), p_start_date, p_end_date, nullif(p_message, ''), v_days * v_listing.price_per_day)
    returning * into v_rental;

    return v_rental;
end;
$$;

grant execute on function public.request_rental(uuid, date, date, text) to authenticated;

-- ============================================================
-- RPC: get_listing_blocked_dates
-- Lets anyone browsing a listing see which date ranges are already
-- booked, without exposing the rest of the rental record (price,
-- message, who booked it) — RLS otherwise hides other people's
-- rentals entirely, which is correct for privacy but leaves renters
-- with no way to avoid requesting dates that are already taken.
-- ============================================================

create or replace function public.get_listing_blocked_dates(p_listing_id uuid)
returns table (start_date date, end_date date)
language sql
security definer set search_path = ''
stable
as $$
    select r.start_date, r.end_date
    from public.rentals r
    where r.listing_id = p_listing_id
      and r.status in ('approved', 'active')
      and r.end_date >= current_date;
$$;

grant execute on function public.get_listing_blocked_dates(uuid) to authenticated;
