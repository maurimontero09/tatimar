/**
 * One-time bootstrap: imports all Notion data into PostgreSQL.
 * Run once after setting up the database:
 *   npx tsx scripts/initial-sync.ts
 */

import { syncEngine } from '../server/notion/sync-engine'
import { prisma } from '../server/db/client'

async function main() {
  console.log('🔄 Starting initial Notion sync...')
  console.log('This may take a few minutes depending on database size.')
  console.log('')

  try {
    console.log('→ Syncing users...')
    await syncEngine.syncUsers()
    console.log('  ✓ Users synced')

    console.log('→ Syncing clients...')
    await syncEngine.syncClients()
    console.log('  ✓ Clients synced')

    console.log('→ Syncing schedules...')
    await syncEngine.syncSchedules()
    console.log('  ✓ Schedules synced')

    const [userCount, clientCount, scheduleCount] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.schedule.count(),
    ])

    console.log('')
    console.log('✅ Initial sync complete!')
    console.log(`   Users:     ${userCount}`)
    console.log(`   Clients:   ${clientCount}`)
    console.log(`   Schedules: ${scheduleCount}`)
    console.log('')
    console.log('The app will continue syncing automatically every 60 seconds.')
  } catch (err) {
    console.error('❌ Sync failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
