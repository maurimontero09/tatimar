import { NextRequest, NextResponse } from 'next/server'
import { syncEngine } from '@/server/notion/sync-engine'

/**
 * Notion doesn't officially support webhooks yet (as of 2025).
 * This endpoint is ready for when they do, or for use with
 * third-party automation tools like Make/Zapier that can POST
 * when a Notion page changes.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-tatimar-secret')

  // Validate shared secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { entity } = body

    // Trigger targeted sync based on entity type
    if (entity === 'schedule' || !entity) {
      await syncEngine.syncSchedules()
    }
    if (entity === 'client' || !entity) {
      await syncEngine.syncClients()
    }

    return NextResponse.json({ ok: true, synced: entity ?? 'all' })
  } catch (err) {
    console.error('[webhook] sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
