import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface NotificationRecord {
  id: string
  user_id: string
  title: string
  body: string | null
  link: string | null
}

// Called by a Supabase Database Webhook every time a row is inserted into
// public.notifications — regardless of whether that insert came from a
// SQL RPC (approve/decline/handoff/return) or a server route (payment,
// late fee). This is what turns an in-app notification into an email,
// without every call site needing to know how to send mail.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.SUPABASE_DB_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json()
  const notification = payload?.record as NotificationRecord | undefined

  if (!notification?.user_id) {
    return NextResponse.json({ error: 'Missing notification record' }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json({ received: true, skipped: 'RESEND_API_KEY not set' })
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(notification.user_id)
  const email = userData?.user?.email
  if (!email) {
    return NextResponse.json({ received: true, skipped: 'no email on file' })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rentify.nl'
  const link = notification.link ? `${siteUrl}${notification.link}` : siteUrl

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Rentify <notifications@rentify.nl>',
      to: email,
      subject: notification.title,
      html: `<p>${notification.body ?? ''}</p><p><a href="${link}">View on Rentify</a></p>`,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    return NextResponse.json({ error: `Resend request failed: ${errorBody}` }, { status: 502 })
  }

  return NextResponse.json({ received: true })
}
