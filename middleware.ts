import { auth } from '@/server/auth/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin':        ['SUPER_ADMIN'],
  '/payroll':      ['SUPER_ADMIN', 'ACCOUNTANT'],
  '/reports':      ['SUPER_ADMIN', 'ACCOUNTANT', 'MANAGER'],
  '/employees':    ['SUPER_ADMIN', 'MANAGER'],
  '/schedule':     ['SUPER_ADMIN', 'MANAGER'],
  '/clients':      ['SUPER_ADMIN', 'MANAGER'],
  '/settings':     ['SUPER_ADMIN'],
  '/certifications': ['SUPER_ADMIN', 'MANAGER'],
  '/cleaner':      ['SUPER_ADMIN', 'CLEANER'],
  '/dashboard':    ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'CLEANER'],
}

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Always allow auth API routes through (sign-out, CSRF, callbacks, etc.)
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from the login page
  if (pathname.startsWith('/login')) {
    if (session?.user) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  // Require auth for all other routes
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = session.user.role

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(role ?? '')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
