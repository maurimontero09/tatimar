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
        // TEMP: bypass DB to confirm auth flow works
        if (credentials?.email === 'admin@tatimar.ca') {
          return { id: 'temp-admin', email: 'admin@tatimar.ca', name: 'Admin', role: 'SUPER_ADMIN' as any }
        }
        return null
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
