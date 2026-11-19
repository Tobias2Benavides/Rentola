-- ============================================================
-- Migration: 020_notification_url_rentifyapp.sql
-- Points the notification webhook at the new domain.
--
-- rentify.nl was rented from Nameshift, not owned, and the rental was
-- cancelled on 2026-10-08 -- its DNS has been dead ever since, so every
-- notification email has been silently failing. The replacement domain
-- is rentifyapp.nl, registered outright.
--
-- Same shape as 010_notification_email_webhook.sql, which this replaces:
-- only the URL changes. This repo is public -- DO NOT commit the real
-- SUPABASE_DB_WEBHOOK_SECRET. Run this in the Supabase SQL Editor with
-- the placeholder below swapped for the real value, exactly as 010 was
-- run. The value must match the x-webhook-secret the route checks.
--
-- The trigger itself (notification_emails) is unchanged and does not
-- need recreating -- replacing the function it calls is enough.
-- ============================================================

create or replace function public.notify_new_notification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    perform net.http_post(
        url := 'https://rentifyapp.nl/api/notifications/send-email',
        body := jsonb_build_object('record', to_jsonb(new)),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', 'REPLACE_WITH_SUPABASE_DB_WEBHOOK_SECRET'
        ),
        timeout_milliseconds := 5000
    );
    return new;
end;
$$;
