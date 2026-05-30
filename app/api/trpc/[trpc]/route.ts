import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/root'
import { createTRPCContext } from '@/server/trpc'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`tRPC error on ${path}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }
