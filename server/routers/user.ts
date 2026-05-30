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
})
