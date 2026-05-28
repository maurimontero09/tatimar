import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getTitle, getRichText, getDate, getSelect, getNumber, getMultiSelect, getRelation } from '../client'
import { prisma } from '@/server/db/client'
import type { Schedule, Client, ScheduleAssignment, User } from '@prisma/client'

type ScheduleWithRelations = Schedule & {
  client: Client
  assignments: Array<ScheduleAssignment & { user: User }>
}

export const scheduleMapper = {
  /** Convert a Notion page → our DB model shape */
  async toModel(page: PageObjectResponse) {
    const clientNotionId = getRelation(page, 'Client')[0]
    if (!clientNotionId) return null

    // Look up client by Notion page ID
    const client = await prisma.client.findUnique({
      where: { notionPageId: clientNotionId },
    })
    if (!client) return null

    const dateStr  = getDate(page, 'Date')
    const startStr = getDate(page, 'Start Time')
    if (!dateStr) return null

    const statusMap: Record<string, string> = {
      'Pending':     'PENDING',
      'In Progress': 'IN_PROGRESS',
      'Completed':   'COMPLETED',
      'Cancelled':   'CANCELLED',
    }

    return {
      clientId:       client.id,
      date:           dateStr,
      startTime:      startStr ?? dateStr,
      maxHours:       getNumber(page, 'Max Hours') ?? 3,
      status:         (statusMap[getSelect(page, 'Status') ?? ''] ?? 'PENDING') as any,
      servicesList:   getMultiSelect(page, 'Services'),
      instructions:   getRichText(page, 'Instructions') || null,
      accessNotes:    getRichText(page, 'Access Notes') || null,
      notes:          getRichText(page, 'Notes') || null,
    }
  },

  /** Convert our DB model → Notion properties for write-back */
  toNotionProperties(schedule: ScheduleWithRelations) {
    const statusMap: Record<string, string> = {
      PENDING:     'Pending',
      IN_PROGRESS: 'In Progress',
      COMPLETED:   'Completed',
      CANCELLED:   'Cancelled',
    }

    return {
      Name: {
        title: [{ text: { content: schedule.client.name } }],
      },
      Status: {
        select: { name: statusMap[schedule.status] ?? 'Pending' },
      },
      Date: {
        date: { start: schedule.date.toISOString().split('T')[0] },
      },
      'Max Hours': {
        number: schedule.maxHours,
      },
      Services: {
        multi_select: schedule.servicesList.map(s => ({ name: s })),
      },
      Instructions: {
        rich_text: schedule.instructions
          ? [{ text: { content: schedule.instructions } }]
          : [],
      },
    }
  },
}
