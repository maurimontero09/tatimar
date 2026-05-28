import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/server/db/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Role } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          console.error('[auth] schema parse failed:', parsed.error.flatten())
          return null
        }

        const user = await prisma.user.findFirst({
          where: { email: parsed.data.email, isActive: true },
        })
        if (!user || !user.passwordHash) {
          console.error('[auth] user not found or no passwordHash for:', parsed.data.email)
          return null
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) {
          console.error('[auth] invalid password for:', parsed.data.email)
          return null
        }

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
        }
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
