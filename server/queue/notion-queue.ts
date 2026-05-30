import type Bull from 'bull'

// Redis is optional — if not configured, queue operations are no-ops
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace('https://', 'rediss://')

type QueueStub = Pick<Bull.Queue, 'add' | 'process' | 'on' | 'getRepeatableJobs'>

function makeStub(): QueueStub {
  return {
    add:               async () => ({} as any),
    process:           (() => {}) as any,
    on:                (() => {}) as any,
    getRepeatableJobs: async () => [],
  }
}

async function makeQueue(name: string, opts?: object): Promise<QueueStub> {
  if (!REDIS_URL) return makeStub()
  const Bull = (await import('bull')).default
  return new Bull(name, { redis: REDIS_URL, ...opts })
}

// Queues are initialized lazily to avoid crashing at build/import time
let _syncQueue:  QueueStub | null = null
let _pollQueue:  QueueStub | null = null

async function getSyncQueue(): Promise<QueueStub> {
  if (!_syncQueue) {
    _syncQueue = await makeQueue('notion-sync', {
      defaultJobOptions: {
        attempts:         5,
        backoff:          { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail:     50,
      },
    })
  }
  return _syncQueue
}

async function getPollQueue(): Promise<QueueStub> {
  if (!_pollQueue) _pollQueue = await makeQueue('notion-poll')
  return _pollQueue
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const notionSyncQueue = {
  add: async (name: string, data: object) => {
    const q = await getSyncQueue()
    return q.add(name, data)
  },
}

export async function startPolling() {
  if (!REDIS_URL) {
    console.warn('[NotionPoll] Redis not configured, polling disabled')
    return
  }
  const { syncEngine } = await import('@/server/notion/sync-engine')
  const q = await getPollQueue()
  const existing = await q.getRepeatableJobs()
  if (existing.length === 0) {
    await q.add('poll', {}, { repeat: { every: 60_000 } } as any)
    q.process('poll', async () => { await syncEngine.syncAll() })
    console.log('[NotionPoll] Started polling every 60s')
  }
}
