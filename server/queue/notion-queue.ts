import Bull from 'bull'
import { syncEngine } from '@/server/notion/sync-engine'

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace('https://', 'rediss://') ?? 'redis://localhost:6379'

// Queue for outbound writes (app → Notion)
export const notionSyncQueue = new Bull('notion-sync', {
  redis: REDIS_URL,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

// Queue for inbound polling (Notion → app)
export const notionPollQueue = new Bull('notion-poll', {
  redis: REDIS_URL,
})

// ─── Write-back worker ────────────────────────────
notionSyncQueue.process('write-schedule', async (job) => {
  const { data } = job.data as { action: string; entity: string; data: { id: string } }
  await syncEngine.writeScheduleToNotion(data.id)
})

notionSyncQueue.process('write-client', async (_job) => {
  // client write-back would go here
})

// ─── Poll worker (runs on a repeating schedule) ───
notionPollQueue.process('poll', async () => {
  await syncEngine.syncAll()
})

// Register the repeating poll job (every 60 seconds)
export async function startPolling() {
  const existing = await notionPollQueue.getRepeatableJobs()
  if (existing.length === 0) {
    await notionPollQueue.add('poll', {}, { repeat: { every: 60_000 } })
    console.log('[NotionPoll] Started polling every 60s')
  }
}

// Error logging
notionSyncQueue.on('failed', (job, err) => {
  console.error(`[NotionSync] Job ${job.id} failed:`, err.message)
})
