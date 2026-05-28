import { z } from 'zod'
import { createTRPCRouter, protectedProcedure, managerProcedure } from '@/server/trpc'
import { addDays } from 'date-fns'

export const certificationRouter = createTRPCRouter({
  // All certifications (types)
  types: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.certification.findMany({ orderBy: { name: 'asc' } })
  }),

  // All user certifications (manager view)
  allUserCerts: managerProcedure
    .input(z.object({ expiringWithinDays: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.expiringWithinDays
        ? { expiresAt: { lte: addDays(new Date(), input.expiringWithinDays), gte: new Date() } }
        : {}

      return ctx.prisma.userCertification.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          certification: true,
        },
        orderBy: { expiresAt: 'asc' },
      })
    }),

  // My certifications (cleaner)
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.userCertification.findMany({
      where: { userId: ctx.session.user.id },
      include: { certification: true },
      orderBy: { expiresAt: 'asc' },
    })
  }),

  // Add certification to user
  assign: managerProcedure
    .input(z.object({
      userId: z.string(),
      certificationId: z.string(),
      issuedAt: z.date(),
      expiresAt: z.date().optional(),
      documentUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userCertification.create({ data: input })
    }),

  // Expire/remove
  revoke: managerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userCertification.delete({ where: { id: input.id } })
    }),
})
