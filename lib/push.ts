import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'hola@milpa.cloud'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const supabase = createServiceClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs?.length) return

  const notification = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      ).catch(() => {
        // Si la suscripción expiró, eliminarla
        supabase.from('push_subscriptions').delete().eq('id', sub.id)
      })
    )
  )
}
