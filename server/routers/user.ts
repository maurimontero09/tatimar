import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, managerProcedure, adminProcedure } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'

export const userRouter = createTRPCRouter({
  // Current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        certifications: {
          include: { certification: true },
          orderBy: { expiresAt: 'asc' },
        },
      },
    })
  }),

  // List all users (manager+)
  list: managerProcedure
    .input(z.object({
      role: z.enum(['SUPER_ADMIN','MANAGER','ACCOUNTANT','CLEANER']).optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          ...(input.role && { role: input.role }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          certifications: {
            include: { certification: true },
            orderBy: { expiresAt: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      })
    }),

  // Get single user
  byId: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        include: {
          certifications: { include: { certification: true } },
          assignments: {
            include: { schedule: { include: { client: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          clockEvents: { orderBy: { timestamp: 'desc' }, take: 20 },
        },
      })
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
      return user
    }),

  // Create user (admin only)
  create: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum(['SUPER_ADMIN','MANAGER','ACCOUNTANT','CLEANER']),
      phone: z.string().optional(),
      password: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email already in use' })

      const { password, ...rest } = input
      const passwordHash = await bcrypt.hash(password, 12)
      return ctx.prisma.user.create({
        data: { ...rest, passwordHash },
      })
    }),

  // Update user
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(['SUPER_ADMIN','MANAGER','ACCOUNTANT','CLEANER']).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.user.update({ where: { id }, data })
    }),

  // Cleaners only
  cleaners: managerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { role: 'CLEANER', isActive: true },
      include: {
        certifications: { include: { certification: true } },
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Sync users from Notion (admin only)
  syncFromNotion: adminProcedure.mutation(async ({ ctx }) => {
    const { Client } = await import('@notionhq/client')
    const bcryptLib   = await import('bcryptjs')
    const notion = new Client({ auth: process.env.NOTION_TOKEN ?? '' })
    const dbId   = process.env.NOTION_USERS_DB_ID
    const domain = process.env.NOTION_USER_EMAIL_DOMAIN ?? 'tatimar.ca'

    if (!dbId) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'NOTION_USERS_DB_ID is not set' })

    const pages: any[] = []
    let cursor: string | undefined
    do {
      const res = await notion.databases.query({ database_id: dbId, start_cursor: cursor, page_size: 100 })
      pages.push(...res.results)
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
    } while (cursor)

    let created = 0, updated = 0, skipped = 0

    for (const page of pages as any[]) {
      const titleProp = page.properties?.username
      const username  = titleProp?.type === 'title' ? titleProp.title[0]?.plain_text ?? '' : ''
      if (!username) { skipped++; continue }

      const email        = username.includes('@') ? username : `${username}@${domain}`
      const fullName     = page.properties?.fullName?.rich_text?.[0]?.plain_text || username
      const plainPwd     = page.properties?.password?.rich_text?.[0]?.plain_text ?? ''
      const formulaProp  = page.properties?.authID
      const authId       = formulaProp?.type === 'formula'
        ? (formulaProp.formula?.string ?? page.id)
        : page.id
      const passwordHash = plainPwd ? await bcryptLib.default.hash(plainPwd, 10) : ''

      const existing = await ctx.prisma.user.findFirst({
        where: { OR: [{ notionUserId: authId }, { email }] },
      })

      if (existing) {
        await ctx.prisma.user.update({
          where: { id: existing.id },
          data: { name: fullName, email, notionUserId: authId, ...(passwordHash && { passwordHash }) },
        })
        updated++
      } else {
        await ctx.prisma.user.create({
          data: { email, name: fullName, notionUserId: authId, passwordHash, role: 'CLEANER', isActive: true },
        })
        created++
      }
    }

    return { created, updated, skipped }
  }),
})
