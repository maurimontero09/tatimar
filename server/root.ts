import { createTRPCRouter } from '@/server/trpc'
import { scheduleRouter }      from './routers/schedule'
import { clockRouter }         from './routers/clock'
import { userRouter }          from './routers/user'
import { clientRouter }        from './routers/client'
import { certificationRouter } from './routers/certification'

export const appRouter = createTRPCRouter({
  schedule:      scheduleRouter,
  clock:         clockRouter,
  user:          userRouter,
  clients:       clientRouter,
  certification: certificationRouter,
})

export type AppRouter = typeof appRouter
