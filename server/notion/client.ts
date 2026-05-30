import { Client } from '@notionhq/client'
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints'

if (!process.env.NOTION_TOKEN) {
  console.warn('[Notion] NOTION_TOKEN is not set — Notion features will be unavailable')
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN ?? '' })

// ─── Database IDs ─────────────────────────────────
export const NOTION_DBS = {
  schedules:      process.env.NOTION_SCHEDULES_DB_ID!,
  clients:        process.env.NOTION_CLIENTS_DB_ID!,
  users:          process.env.NOTION_USERS_DB_ID!,
  certifications: process.env.NOTION_CERTIFICATIONS_DB_ID!,
  products:       process.env.NOTION_PRODUCTS_DB_ID!,
  locations:      process.env.NOTION_LOCATIONS_DB_ID!,
} as const

// ─── Helpers ──────────────────────────────────────

/** Get all pages from a database (handles pagination) */
export async function queryAll(
  databaseId: string,
  filter?: QueryDatabaseParameters['filter'],
  lastEditedAfter?: string
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  const baseFilter = lastEditedAfter
    ? {
        timestamp: 'last_edited_time' as const,
        last_edited_time: { after: lastEditedAfter },
      }
    : undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: baseFilter ?? filter,
      start_cursor: cursor,
      page_size: 100,
    })

    pages.push(...(response.results as PageObjectResponse[]))
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages
}

// ─── Property extractors ──────────────────────────

export function getTitle(page: PageObjectResponse, prop = 'Name'): string {
  const p = page.properties[prop]
  if (p?.type === 'title') return p.title[0]?.plain_text ?? ''
  return ''
}

export function getRichText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (p?.type === 'rich_text') return p.rich_text[0]?.plain_text ?? ''
  return ''
}

export function getDate(page: PageObjectResponse, prop: string): Date | null {
  const p = page.properties[prop]
  if (p?.type === 'date' && p.date?.start) return new Date(p.date.start)
  return null
}

export function getSelect(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  if (p?.type === 'select') return p.select?.name ?? null
  return null
}

export function getNumber(page: PageObjectResponse, prop: string): number | null {
  const p = page.properties[prop]
  if (p?.type === 'number') return p.number
  return null
}

export function getMultiSelect(page: PageObjectResponse, prop: string): string[] {
  const p = page.properties[prop]
  if (p?.type === 'multi_select') return p.multi_select.map(s => s.name)
  return []
}

export function getCheckbox(page: PageObjectResponse, prop: string): boolean {
  const p = page.properties[prop]
  if (p?.type === 'checkbox') return p.checkbox
  return false
}

export function getRelation(page: PageObjectResponse, prop: string): string[] {
  const p = page.properties[prop]
  if (p?.type === 'relation') return p.relation.map(r => r.id)
  return []
}

export function getFormula(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop]
  if (p?.type !== 'formula') return null
  const f = p.formula
  if (f.type === 'string')  return f.string  ?? null
  if (f.type === 'number')  return f.number != null ? String(f.number) : null
  if (f.type === 'boolean') return String(f.boolean)
  return null
}
