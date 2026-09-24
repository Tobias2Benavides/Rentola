-- ============================================================
-- Migration: 009_reviews.sql
-- Mutual reviews between owner and renter after a rental completes.
-- profiles.average_rating existed since Phase 1, documented then as
-- "Phase 4 populates" — this is what populates it.
-- ============================================================

create table public.reviews (
    id            uuid        not null default gen_random_uuid(),
    rental_id     uuid        not null references public.rentals on delete cascade,
    reviewer_id   uuid        not null references auth.users on delete cascade,
    reviewee_id   uuid        not null references auth.users on delete cascade,
    rating        smallint    not null check (rating between 1 and 5),
    comment       text,
    created_at    timestamptz not null default now(),
    primary key (id),
    unique (rental_id, reviewer_id)
);

alter table public.reviews enable row level security;

-- Visible to anyone signed in — this is the trust signal listings/profiles surface
create policy "Authenticated users can view reviews"
    on public.reviews for select
    to authenticated
    using (true);

create policy "Rental participants can review each other once returned"
    on public.reviews for insert
    to authenticated
    with check (
        reviewer_id = (select auth.uid())
        and exists (
            select 1 from public.rentals r
            where r.id = rental_id
              and r.status = 'returned'
              and (
                  (r.renter_id = reviewer_id and r.owner_id = reviewee_id)
                  or (r.owner_id = reviewer_id and r.renter_id = reviewee_id)
              )
        )
    );

create index reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index reviews_rental_id_idx on public.reviews (rental_id);

-- Keep profiles.average_rating in sync whenever a review comes in
create or replace function public.update_profile_rating()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    update public.profiles
    set average_rating = (
        select coalesce(round(avg(rating), 2), 0)
        from public.reviews
        where reviewee_id = new.reviewee_id
    )
    where id = new.reviewee_id;
    return new;
end;
$$;

create trigger on_review_created
    after insert on public.reviews
    for each row execute procedure public.update_profile_rating();
