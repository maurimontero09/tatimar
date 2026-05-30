/**
 * One-time user import from Notion → PostgreSQL.
 * Does not require Redis.
 * Run with: npm run users:import
 */

import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const prisma  = new PrismaClient()

const EMAIL_DOMAIN = process.env.NOTION_USER_EMAIL_DOMAIN ?? 'tatimar.ca'

function getTitle(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (p?.type === 'title') return p.title[0]?.plain_text ?? ''
  return ''
}

function getRichText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (p?.type === 'rich_text') return p.rich_text[0]?.plain_text ?? ''
  return ''
}

function getFormula(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  if (p?.type !== 'formula') return null
  const f = p.formula
  if (f.type === 'string') return f.string ?? null
  if (f.type === 'number') return f.number != null ? String(f.number) : null
  return null
}

async function main() {
  const dbId = process.env.NOTION_USERS_DB_ID
  if (!dbId) throw new Error('NOTION_USERS_DB_ID is not set')

  console.log('🔄 Importing users from Notion...\n')

  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  console.log(`Found ${pages.length} user(s) in Notion\n`)

  let created = 0, updated = 0, skipped = 0

  for (const page of pages) {
    const username = getTitle(page, 'username')
    if (!username) { skipped++; continue }

    const email        = username.includes('@') ? username : `${username}@${EMAIL_DOMAIN}`
    const name         = getRichText(page, 'fullName') || username
    const plainPwd     = getRichText(page, 'password')
    const notionUserId = getFormula(page, 'authID') ?? page.id
    const passwordHash = plainPwd ? await bcrypt.hash(plainPwd, 10) : ''

    const existing = await prisma.user.findFirst({
      where: { OR: [{ notionUserId }, { email }] },
    })

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, email, notionUserId, ...(passwordHash && { passwordHash }) },
      })
      console.log(`  ↻  Updated: ${email}`)
      updated++
    } else {
      await prisma.user.create({
        data: { email, name, notionUserId, passwordHash, role: 'CLEANER', isActive: true },
      })
      console.log(`  +  Created: ${email}`)
      created++
    }
  }

  console.log(`\n✅ Done — ${created} created, ${updated} updated, ${skipped} skipped`)
}

main()
  .catch(err => { console.error('❌ Import failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
