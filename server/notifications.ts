import webpush from 'web-push'
import { Resend } from 'resend'
import { prisma } from '@/server/db/client'

// ─── Twilio SMS ───────────────────────────────────────────────────────────────

export async function sendSms(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !from) {
    console.warn('[SMS] Twilio not configured — skipping:', body)
    return
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(sid, token)
    const msg = await client.messages.create({ to, from, body })
    console.log(`[SMS] Sent to ${to} — SID: ${msg.sid} status: ${msg.status}`)
  } catch (err: any) {
    console.error(`[SMS] Failed to send to ${to} — code: ${err?.code} message: ${err?.message}`)
  }
}

if (process.env.VAPID_EMAIL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type NotificationType =
  | 'schedule_assigned'
  | 'schedule_updated'
  | 'schedule_cancelled'
  | 'cert_expiring'
  | 'cert_expired'
  | 'clock_in_late'

interface NotifyPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  url?: string
  data?: Record<string, unknown>
}

export async function notify(payload: NotifyPayload) {
  const [pushSubs, user] = await Promise.all([
    prisma.pushSubscription.findMany({ where: { userId: payload.userId } }),
    prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true, name: true } }),
  ])

  // Web push
  const pushPromises = pushSubs.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/' })
    ).catch(err => {
      // Remove invalid subscriptions
      if (err.statusCode === 410) {
        return prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
      console.error('Push failed:', err)
    })
  )

  await Promise.allSettled(pushPromises)
}

/** Notify all managers of a critical event */
export async function notifyManagers(title: string, body: string, url?: string) {
  const managers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'MANAGER'] }, isActive: true },
    select: { id: true },
  })

  await Promise.allSettled(
    managers.map(m => notify({ userId: m.id, type: 'clock_in_late', title, body, url }))
  )
}

/** Send cert expiry notifications for certs expiring in 60, 30, or 7 days */
export async function sendCertExpiryAlerts() {
  const thresholds = [60, 30, 7]
  const now = new Date()

  for (const days of thresholds) {
    const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    const targetStart = new Date(target); targetStart.setHours(0, 0, 0, 0)
    const targetEnd   = new Date(target); targetEnd.setHours(23, 59, 59, 999)

    const expiring = await prisma.userCertification.findMany({
      where: { expiresAt: { gte: targetStart, lte: targetEnd } },
      include: {
        user: { select: { id: true, name: true } },
        certification: { select: { name: true } },
      },
    })

    for (const cert of expiring) {
      await notify({
        userId: cert.user.id,
        type: 'cert_expiring',
        title: `Certification expiring in ${days} days`,
        body: `${cert.certification.name} expires on ${cert.expiresAt?.toLocaleDateString()}`,
        url: '/my-certifications',
      })

      // Also alert managers
      await notifyManagers(
        `Cert expiring: ${cert.user.name}`,
        `${cert.certification.name} expires in ${days} days`,
        '/certifications'
      )
    }
  }
}
