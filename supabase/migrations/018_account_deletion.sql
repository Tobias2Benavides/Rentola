-- ============================================================
-- Migration: 018_account_deletion.sql
-- "Delete my account" is a soft, anonymizing delete, not a hard
-- auth.users delete -- profiles.id, listings.owner_id, rentals.*, etc.
-- all cascade from auth.users, so hard-deleting the row would also
-- wipe the OTHER party's reviews, messages, and rental history, which
-- GDPR doesn't require and the business shouldn't lose. Instead this
-- RPC scrubs the account's own PII and flags it deleted; the Next.js
-- route that calls it (app/api/account/delete/route.ts) then uses the
-- service-role admin client to randomize the auth email/password so
-- the account can't sign back in -- that part can't happen here since
-- SECURITY DEFINER plpgsql can't touch auth.users directly.
-- ============================================================

alter table public.profiles add column deleted_at timestamptz;

create or replace function public.request_account_deletion()
returns public.profiles
language plpgsql
security definer set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_active_count int;
    v_profile public.profiles;
begin
    if v_user_id is null then
        raise exception 'Not authenticated';
    end if;

    select count(*) into v_active_count
    from public.rentals
    where (owner_id = v_user_id or renter_id = v_user_id)
      and status in ('pending', 'approved', 'active');

    if v_active_count > 0 then
        raise exception 'You have an active or pending rental -- resolve it before deleting your account';
    end if;

    update public.listings set is_active = false where owner_id = v_user_id;

    update public.profiles
    set display_name = null,
        bio = null,
        avatar_url = null,
        payment_instructions = null,
        stripe_account_id = null,
        stripe_onboarding_complete = false,
        deleted_at = now()
    where id = v_user_id
    returning * into v_profile;

    return v_profile;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;
