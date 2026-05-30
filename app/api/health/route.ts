import { prisma } from '@/server/db/client'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, isActive: true, passwordHash: true },
    })
    return NextResponse.json({
      ok: true,
      userCount: users.length,
      users: users.map(u => ({
        email: u.email,
        isActive: u.isActive,
        hasPassword: !!u.passwordHash,
      })),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
