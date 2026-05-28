import { notion, NOTION_DBS, queryAll } from './client'
import { scheduleMapper } from './mappers/schedule.mapper'
import { clientMapper }   from './mappers/client.mapper'
import { prisma }         from '@/server/db/client'
import { Redis }          from '@upstash/redis'

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const SYNC_KEY = (db: string) => `notion:last_sync:${db}`

export class NotionSyncEngine {
  /**
   * Incremental sync: only fetch pages modified since last sync.
   * Safe to call frequently (every 60s in the queue worker).
   */
  async syncAll() {
    const results = await Promise.allSettled([
      this.syncSchedules(),
      this.syncClients(),
    ])

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[NotionSync] error:', result.reason)
      }
    }
  }

  async syncSchedules() {
    const lastSync = await redis.get<string>(SYNC_KEY('schedules'))
    const pages    = await queryAll(NOTION_DBS.schedules, undefined, lastSync ?? undefined)

    let created = 0, updated = 0, errors = 0

    for (const page of pages) {
      try {
        const model = await scheduleMapper.toModel(page)
        if (!model) continue

        await prisma.schedule.upsert({
          where: { notionPageId: page.id },
          create: { ...model, notionPageId: page.id, notionSyncedAt: new Date() },
          update: { ...model, notionSyncedAt: new Date() },
        })

        await prisma.notionSyncLog.create({
          data: {
            entity:    'schedule',
            notionId:  page.id,
            action:    'upsert',
            direction: 'NOTION_TO_DB',
            status:    'SUCCESS',
          },
        })
        created++
      } catch (err) {
        errors++
        await prisma.notionSyncLog.create({
          data: {
            entity:    'schedule',
            notionId:  page.id,
            action:    'upsert',
            direction: 'NOTION_TO_DB',
            status:    'ERROR',
            error:     String(err),
          },
        })
      }
    }

    await redis.set(SYNC_KEY('schedules'), new Date().toISOString())
    console.log(`[NotionSync] schedules: ${created} upserted, ${errors} errors`)
  }

  async syncClients() {
    const lastSync = await redis.get<string>(SYNC_KEY('clients'))
    const pages    = await queryAll(NOTION_DBS.clients, undefined, lastSync ?? undefined)

    for (const page of pages) {
      try {
        const model = clientMapper.toModel(page)
        await prisma.client.upsert({
          where: { notionPageId: page.id },
          create: { ...model, notionPageId: page.id },
          update: { ...model, notionSyncedAt: new Date() },
        })
      } catch (err) {
        console.error('[NotionSync] client error:', err)
      }
    }

    await redis.set(SYNC_KEY('clients'), new Date().toISOString())
  }

  /**
   * Write a schedule back to Notion (after creation/update in our app).
   */
  async writeScheduleToNotion(scheduleId: string) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { client: true, assignments: { include: { user: true } } },
    })
    if (!schedule) return

    const properties = scheduleMapper.toNotionProperties(schedule)

    if (schedule.notionPageId) {
      await notion.pages.update({
        page_id: schedule.notionPageId,
        properties,
      })
    } else {
      const page = await notion.pages.create({
        parent: { database_id: NOTION_DBS.schedules },
        properties,
      })
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: { notionPageId: page.id, notionSyncedAt: new Date() },
      })
    }
  }
}

export const syncEngine = new NotionSyncEngine()
