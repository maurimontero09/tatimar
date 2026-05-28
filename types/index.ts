import type { User, Schedule, Client, ScheduleAssignment, ClockEvent } from '@prisma/client'

export type { Role } from '@prisma/client'

export type UserWithCerts = User & {
  certifications: Array<{
    id: string
    issuedAt: Date
    expiresAt: Date | null
    certification: { name: string }
  }>
}

export type ScheduleWithRelations = Schedule & {
  client: Client
  assignments: Array<ScheduleAssignment & { user: User }>
  clockEvents: ClockEvent[]
}

export type CertStatus = 'valid' | 'expiring' | 'expired'

export function getCertStatus(expiresAt: Date | null): CertStatus {
  if (!expiresAt) return 'valid'
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 60) return 'expiring'
  return 'valid'
}

export function getDaysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null
  const now = new Date()
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
