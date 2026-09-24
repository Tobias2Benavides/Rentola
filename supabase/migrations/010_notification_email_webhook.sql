-- ============================================================
-- Migration: 010_notification_email_webhook.sql
-- Forwards every new notification to the send-email route, which
-- relays it through Resend. Built directly on pg_net rather than the
-- Database Webhooks dashboard wrapper (supabase_functions.http_request),
-- since that wrapper's schema is only provisioned the first time someone
-- uses the Webhooks page in the Dashboard, which this project never has.
-- See https://supabase.com/docs/guides/database/extensions/pg_net
--
-- This repo is public -- do not paste your real SUPABASE_DB_WEBHOOK_SECRET
-- into this file. Run this migration with the placeholder replaced inline
-- in the SQL Editor instead; don't commit the real value.
-- ============================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_notification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    perform net.http_post(
        url := 'https://rentify.nl/api/notifications/send-email',
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

create trigger notification_emails
    after insert on public.notifications
    for each row execute function public.notify_new_notification();
