import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@/server/auth/config'
import { prisma } from '@/server/db/client'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Role } from '@prisma/client'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

// ─── Context ──────────────────────────────────────
export async function createTRPCContext(_opts: FetchCreateContextFnOptions) {
  const session = await auth()
  return { session, prisma }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// ─── Init ─────────────────────────────────────────
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter  = t.router
export const publicProcedure   = t.procedure

// ─── Auth middleware ──────────────────────────────
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { session: ctx.session } })
})

const enforceRole = (...roles: Role[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    if (!roles.includes(ctx.session.user.role as Role))
      throw new TRPCError({ code: 'FORBIDDEN' })
    return next({ ctx: { session: ctx.session } })
  })

// ─── Protected procedures ─────────────────────────
export const protectedProcedure  = t.procedure.use(enforceAuth)
export const managerProcedure    = t.procedure.use(enforceRole('SUPER_ADMIN', 'MANAGER'))
export const accountantProcedure = t.procedure.use(enforceRole('SUPER_ADMIN', 'ACCOUNTANT'))
export const adminProcedure      = t.procedure.use(enforceRole('SUPER_ADMIN'))
