import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Role } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TEMP: hardcoded accounts while DB connection is resolved
        const TEMP_USERS: Record<string, { id: string; name: string; role: string }> = {
          'admin@tatimar.ca':          { id: 'tmp-1', name: 'Alex Martin',    role: 'SUPER_ADMIN' },
          'manager@tatimar.ca':        { id: 'tmp-2', name: 'Jean Bouchard',  role: 'MANAGER'     },
          'finance@tatimar.ca':        { id: 'tmp-3', name: 'Claire Dubois',  role: 'ACCOUNTANT'  },
          'maria@tatimar.ca':          { id: 'tmp-4', name: 'Maria Dupont',   role: 'CLEANER'     },
          'jean@tatimar.ca':           { id: 'tmp-5', name: 'Jean Tremblay',  role: 'CLEANER'     },
          'alvaro.user@tatimar.ca':    { id: 'tmp-6', name: 'Alvaro',         role: 'CLEANER'     },
          'giovanni.user@tatimar.ca':  { id: 'tmp-7', name: 'Giovanni',       role: 'CLEANER'     },
        }
        const email = credentials?.email as string | undefined
        const user  = email ? TEMP_USERS[email] : null
        if (!user) return null
        return { id: user.id, email, name: user.name, role: user.role as any }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id as string
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
})

declare module 'next-auth' {
  interface User { role: Role }
  interface Session {
    user: { id: string; role: Role; email: string; name: string }
  }
}
declare module '@auth/core/jwt' {
  interface JWT { id: string; role: Role }
}
